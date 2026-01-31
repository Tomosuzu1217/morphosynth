/**
 * ComfyUI API Integration Service
 * ローカルComfyUIサーバーとの統合（技術レポート準拠）
 * 
 * 使用方法:
 * 1. ComfyUIをローカルで起動（run_nvidia_gpu.bat）
 * 2. このサービスをインポートしてgenerateWithComfyUI()を呼び出す
 */

// ComfyUI APIエンドポイント
const COMFYUI_BASE_URL = 'http://127.0.0.1:8188';

// 画像生成用のワークフロー（シンプルなtxt2img）
const createWorkflow = (prompt: string, negativePrompt: string = '') => ({
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "seed": Math.floor(Math.random() * 1000000000),
            "steps": 20,
            "cfg": 7,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
        }
    },
    "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
            "ckpt_name": "v1-5-pruned-emaonly.safetensors"
        }
    },
    "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
            "width": 512,
            "height": 512,
            "batch_size": 1
        }
    },
    "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": prompt,
            "clip": ["4", 1]
        }
    },
    "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": negativePrompt || "blurry, low quality, distorted",
            "clip": ["4", 1]
        }
    },
    "8": {
        "class_type": "VAEDecode",
        "inputs": {
            "samples": ["3", 0],
            "vae": ["4", 2]
        }
    },
    "9": {
        "class_type": "SaveImage",
        "inputs": {
            "filename_prefix": "ComfyUI",
            "images": ["8", 0]
        }
    }
});

/**
 * ComfyUIサーバーの状態を確認
 */
export const checkComfyUIStatus = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${COMFYUI_BASE_URL}/system_stats`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
        });
        return response.ok;
    } catch {
        return false;
    }
};

/**
 * ComfyUIで画像を生成
 * @param prompt 画像の説明
 * @param negativePrompt 除外する要素
 * @returns 生成された画像のData URL、または null（失敗時）
 */
export const generateWithComfyUI = async (
    prompt: string,
    negativePrompt: string = ''
): Promise<string | null> => {
    try {
        // 1. サーバー状態確認
        const isOnline = await checkComfyUIStatus();
        if (!isOnline) {
            console.warn('⚠️ ComfyUI server is not running');
            return null;
        }

        console.log('🎨 Attempting ComfyUI generation for:', prompt);

        // 2. ワークフローを送信
        const workflow = createWorkflow(
            `360 degree panoramic environment, ${prompt}, highly detailed, ethereal, moody atmosphere`,
            negativePrompt
        );

        const queueResponse = await fetch(`${COMFYUI_BASE_URL}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: workflow }),
        });

        if (!queueResponse.ok) {
            console.warn('ComfyUI queue failed:', await queueResponse.text());
            return null;
        }

        const queueData = await queueResponse.json();
        const promptId = queueData.prompt_id;
        console.log('🔄 ComfyUI prompt queued:', promptId);

        // 3. 完了をポーリング（最大60秒）
        const maxWait = 60000;
        const pollInterval = 1000;
        let waited = 0;

        while (waited < maxWait) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            waited += pollInterval;

            const historyResponse = await fetch(`${COMFYUI_BASE_URL}/history/${promptId}`);
            const historyData = await historyResponse.json();

            if (historyData[promptId]) {
                const outputs = historyData[promptId].outputs;

                // SaveImageノード（9番）から出力を取得
                if (outputs?.['9']?.images?.[0]) {
                    const imageInfo = outputs['9'].images[0];
                    const imageUrl = `${COMFYUI_BASE_URL}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type}`;

                    // 画像をData URLに変換
                    const imageResponse = await fetch(imageUrl);
                    const blob = await imageResponse.blob();
                    const dataUrl = await blobToDataUrl(blob);

                    console.log('✅ ComfyUI generation successful');
                    return dataUrl;
                }
            }

            console.log(`🔄 ComfyUI: waiting... (${waited / 1000}s / ${maxWait / 1000}s)`);
        }

        console.warn('ComfyUI: timeout');
        return null;

    } catch (e) {
        console.warn('ComfyUI error:', e);
        return null;
    }
};

/**
 * Blob を Data URL に変換
 */
const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * LLM用ツールスキーマ（OpenAI Function Calling互換）
 */
export const comfyUIToolSchema = {
    name: "generate_image_local",
    description: "ローカルのComfyUI（Stable Diffusion）で画像を生成します。サーバーが起動している必要があります。",
    parameters: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "生成したい画像の詳細な説明"
            },
            negative_prompt: {
                type: "string",
                description: "画像から除外したい要素（例: 'blurry, low quality'）",
                default: "blurry, low quality, distorted, text, watermark"
            }
        },
        required: ["prompt"]
    }
};

/**
 * Automatic1111 WebUI APIとの統合
 * ComfyUIが利用できない場合のフォールバック
 */
export const generateWithA1111 = async (
    prompt: string,
    negativePrompt: string = ''
): Promise<string | null> => {
    const A1111_URL = 'http://127.0.0.1:7860';

    try {
        const response = await fetch(`${A1111_URL}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `360 degree panoramic environment, ${prompt}, highly detailed`,
                negative_prompt: negativePrompt || 'blurry, low quality, distorted',
                steps: 20,
                sampler_name: 'Euler a',
                cfg_scale: 7,
                width: 512,
                height: 512,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.images?.[0]) {
                console.log('✅ A1111 generation successful');
                return `data:image/png;base64,${data.images[0]}`;
            }
        }

        return null;
    } catch (e) {
        console.warn('A1111 error:', e);
        return null;
    }
};
