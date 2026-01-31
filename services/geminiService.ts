
import { GoogleGenAI, Type } from "@google/genai";
import { AISimulationResponse } from "../types";

// APIキーはメモリ内でのみ管理（セッションごとにユーザーが入力）
let currentApiKey: string | null = null;

export const setApiKey = (key: string) => {
  currentApiKey = key;
};

export const clearApiKey = () => {
  currentApiKey = null;
};

export const hasApiKey = (): boolean => {
  return currentApiKey !== null && currentApiKey.length > 0;
};

const getAI = () => {
  if (!currentApiKey) {
    throw new Error("APIキーが設定されていません");
  }
  return new GoogleGenAI({ apiKey: currentApiKey });
};

export const generateSimulation = async (prompt: string): Promise<AISimulationResponse> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    // ユーザー推奨の最新高速モデル
    model: "gemini-3-flash-preview",
    contents: `As a Master Digital Architect & Sound Artist for "MORPHOSYNTH", synthesize a coherent reality based on: "${prompt}".
    
    [[ MISSION ]]
    Transform abstract concepts into TANGIBLE DIGITAL MATTER and HARMONIC SOUNDSCAPES.
    You are both a Physicist (simulation accuracy) and a Poet (aesthetic beauty).

    [[ VISUAL SPECS ]]
    - Concept: Digital ephemerality, liquid mercury, ferrofluid, glass, void.
    - Geometry: Choose form based on semantics (e.g., "Sharp" -> Spikes, "Soft" -> Blobs).
    - Camera: Cinematic motion. "TRACKING_ARC" is default. "MACRO" for details. "ORBIT" for overview.
    - Material: PBR Workflow. High metalness (>0.8) + Low roughness (<0.2) = Liquid Metal.
    - Post-Process: BLOOM should be subtle (0.05-0.2). NO blinding lights.
    - CRITICAL: emissiveIntensity must be 0.0 to 0.1. Shadows define the form.

    [[ AUDIO SPECS - 坂本龍一 ⇔ 小室哲哉 CROSSFADE SYSTEM ]]
    - styleRatio: 0.0 = Ryuichi Sakamoto style (ambient piano, slow, meditative)
                 1.0 = Tetsuya Komuro style (trance synth, fast, energetic EDM)
    - Keywords mapping:
      * 「雨」「夢」「水」「静寂」「幻想」「月」 → styleRatio LOW (0.0-0.3)
      * 「都市」「夜」「覚醒」「疾走」「高揚」「dance」 → styleRatio HIGH (0.7-1.0)
    - bpm: 60-80 for Sakamoto style, 120-150 for Komuro style
    - gateIntensity: 0.0-0.3 for ambient, 0.5-1.0 for trance gate effect
    - Harmony: GENERATE A VALID FREQUENCY ARRAY (Hz) for "musicalScale".
    - Rule: Frequencies must be mathematically related (e.g., Pentatonic, Harmonic Series).
    
    [[ VISUAL IRIDESCENCE ]]
    - iridescenceIntensity: 0.0-1.0 (薄膜干渉/虹色反射の強度)
    - Higher values for more rainbow-like, oil-slick reflections
    
    Choose a shapeType from: LEVITROPE, HOUSEHOLD, VOXEL, PARTICLES, COMPLEX, SLIME.`,
    config: {
      systemInstruction: `You are the MORPHOSYNTH ENGINE.
      Output JSON strictly.
      
      CONSTRAINTS:
      1. musicalScale MUST be an array of 4-8 frequencies (Numbers in Hz). NO NOTE NAMES.
      2. emissiveIntensity must be low (0.0 - 0.2).
      3. fusionFactor (0.0-1.0) controls how objects merge.
      4. cameraMode: TRACKING_ARC, PUSH_IN, DOLLY_ZOOM, HANDHELD, MACRO, ORBIT.
      5. colorPalette: 3-5 hex codes. Dark and elegant.
      6. styleRatio (0.0-1.0): 0.0=坂本龍一(ambient), 1.0=小室哲哉(trance).
      7. bpm: Match the styleRatio. Low ratio → 60-80, High ratio → 120-150.
      8. gateIntensity (0.0-1.0): Trance gate depth. Higher for Komuro style.
      9. iridescenceIntensity (0.0-1.0): Rainbow reflection strength.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          simulation: {
            type: Type.OBJECT,
            properties: {
              shapeType: { type: Type.STRING },
              colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
              rotationSpeed: { type: Type.NUMBER },
              mutationScale: { type: Type.NUMBER },
              complexity: { type: Type.NUMBER },
              roughness: { type: Type.NUMBER },
              metalness: { type: Type.NUMBER },
              ior: { type: Type.NUMBER },
              clearcoat: { type: Type.NUMBER },
              transmission: { type: Type.NUMBER },
              thickness: { type: Type.NUMBER },
              viscosity: { type: Type.NUMBER },
              reflectivity: { type: Type.NUMBER },
              wireframe: { type: Type.BOOLEAN },
              bloomIntensity: { type: Type.NUMBER },
              environmentType: { type: Type.STRING },
              cameraMode: { type: Type.STRING },
              attenuationColor: { type: Type.STRING },
              attenuationDistance: { type: Type.NUMBER },
              specularIntensity: { type: Type.NUMBER },
              specularColor: { type: Type.STRING },
              emissiveColor: { type: Type.STRING },
              emissiveIntensity: { type: Type.NUMBER },
              audioReactivity: { type: Type.NUMBER },
              levitationScale: { type: Type.NUMBER },
              particleDensity: { type: Type.NUMBER },
              shadowIntensity: { type: Type.NUMBER },
              objectCount: { type: Type.NUMBER },
              fusionFactor: { type: Type.NUMBER },
              iridescenceIntensity: { type: Type.NUMBER }
            },
            required: ["shapeType", "colorPalette", "objectCount", "cameraMode", "shadowIntensity"]
          },
          sound: {
            type: Type.OBJECT,
            properties: {
              baseFrequency: { type: Type.NUMBER },
              oscillatorType: { type: Type.STRING },
              filterFrequency: { type: Type.NUMBER },
              reverbWetness: { type: Type.NUMBER },
              distortionAmount: { type: Type.NUMBER },
              attack: { type: Type.NUMBER },
              release: { type: Type.NUMBER },
              rhythmSpeed: { type: Type.NUMBER },
              musicalScale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              harmonyType: { type: Type.STRING },
              glitchAmount: { type: Type.NUMBER },
              styleRatio: { type: Type.NUMBER },
              bpm: { type: Type.NUMBER },
              gateIntensity: { type: Type.NUMBER }
            },
            required: ["musicalScale", "harmonyType", "glitchAmount", "styleRatio", "bpm"]
          },
          description: { type: Type.STRING },
          imagePrompt: { type: Type.STRING }
        },
        required: ["simulation", "sound", "description", "imagePrompt"]
      }
    }
  });

  try {
    const rawText = response.text || "{}";
    return JSON.parse(rawText) as AISimulationResponse;
  } catch (e) {
    console.error("Gemini Parse Error:", e);
    throw new Error("Matter synthesis failed.");
  }
};

// フォールバック用のプロシージャル画像生成（APIが使えない場合用）
// Poly Haven無料HDRIのリスト（商用利用可能、CC0ライセンス）
const HDRI_LIST = [
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/autumn_forest_01_1k.hdr',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/industrial_sunset_puresky_1k.hdr',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/christmas_photo_studio_01_1k.hdr',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr',
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dikhololo_night_1k.hdr',
];

// キーワードに基づいてHDRIを選択
const selectHdriByKeyword = (keyword: string): string => {
  const kw = keyword.toLowerCase();
  if (kw.includes('forest') || kw.includes('nature') || kw.includes('green')) {
    return HDRI_LIST[0]; // autumn_forest
  }
  if (kw.includes('sunset') || kw.includes('orange') || kw.includes('warm')) {
    return HDRI_LIST[1]; // industrial_sunset
  }
  if (kw.includes('studio') || kw.includes('clean') || kw.includes('white')) {
    return HDRI_LIST[2]; // christmas_photo_studio
  }
  if (kw.includes('night') || kw.includes('dark') || kw.includes('space')) {
    return HDRI_LIST[4]; // dikhololo_night
  }
  // デフォルト: スタジオ
  return HDRI_LIST[3]; // studio_small
};


const generateFallbackImage = (prompt?: string): string => {
  if (typeof document === 'undefined') return ''; // サーバーサイド対策

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const w = canvas.width;
  const h = canvas.height;
  const p = prompt?.toLowerCase() || '';

  // プロンプトに応じたカラーパレットを選択
  let colors: { top: string; mid: string; bottom: string; accent: string };

  if (p.includes('butterfly') || p.includes('蝶') || p.includes('胡蝶') || p.includes('dream') || p.includes('夢')) {
    // 胡蝶の夢: 紫と青の幻想的な色
    colors = { top: '#1a0a3a', mid: '#3a1a5a', bottom: '#0a0020', accent: '180, 100, 255' };
  } else if (p.includes('forest') || p.includes('森') || p.includes('nature') || p.includes('自然') || p.includes('緑')) {
    colors = { top: '#0a2a1a', mid: '#1a4a2a', bottom: '#001a0a', accent: '100, 200, 100' };
  } else if (p.includes('ocean') || p.includes('sea') || p.includes('海') || p.includes('水')) {
    colors = { top: '#0a1a3a', mid: '#1a3a5a', bottom: '#000a20', accent: '100, 180, 255' };
  } else if (p.includes('sunset') || p.includes('夕') || p.includes('warm') || p.includes('火')) {
    colors = { top: '#3a1a0a', mid: '#5a2a1a', bottom: '#200a00', accent: '255, 150, 80' };
  } else if (p.includes('space') || p.includes('宇宙') || p.includes('星') || p.includes('cosmos')) {
    colors = { top: '#0a0020', mid: '#1a0a30', bottom: '#000010', accent: '200, 200, 255' };
  } else if (p.includes('cherry') || p.includes('桜') || p.includes('花') || p.includes('spring')) {
    colors = { top: '#2a1a2a', mid: '#4a2a3a', bottom: '#1a0a1a', accent: '255, 180, 200' };
  } else {
    // デフォルト: ダークブルー
    colors = { top: '#0f172a', mid: '#1e1b4b', bottom: '#000000', accent: '150, 200, 255' };
  }

  // グラデーション背景
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, colors.top);
  grad.addColorStop(0.5, colors.mid);
  grad.addColorStop(1, colors.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 放射状のグロー効果
  const centerGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  centerGrad.addColorStop(0, `rgba(${colors.accent}, 0.15)`);
  centerGrad.addColorStop(0.5, `rgba(${colors.accent}, 0.05)`);
  centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = centerGrad;
  ctx.fillRect(0, 0, w, h);

  // 光の玉（ボケ表現）を増やす
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 100 + 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const alpha = Math.random() * 0.2 + 0.05;
    const useAccent = Math.random() > 0.6;
    const color = useAccent ? colors.accent : '255, 255, 255';
    g.addColorStop(0, `rgba(${color}, ${alpha})`);
    g.addColorStop(0.5, `rgba(${color}, ${alpha * 0.3})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 微細なノイズテクスチャ
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  console.log("🎨 Generated fallback image for prompt:", prompt);
  return canvas.toDataURL('image/jpeg', 0.9);
};

export const generateWorldImage = async (imagePrompt: string): Promise<string> => {
  // === 確実性優先の背景生成スタック ===
  // 0. ComfyUI（ローカルサーバーが起動していれば最優先★★★★★）
  // 1. Canvas 2D（デフォルト・即時・確実）
  // 2. AI Horde（無料・Stable Diffusion・非同期）
  // 3. Gemini API（APIキーがあれば試行）

  if (!imagePrompt) {
    console.log("No prompt provided, using procedural background");
    return generateFallbackImage("default");
  }

  // まず即座にCanvas 2D背景を生成（体験開始を高速化）
  const proceduralImage = generateFallbackImage(imagePrompt);
  console.log("🎨 Procedural background ready (instant)");

  // === ComfyUI（ローカル・最高品質・確実性★★★★★）===
  try {
    console.log("🎨 Checking ComfyUI local server...");
    const { generateWithComfyUI, checkComfyUIStatus } = await import('./comfyuiService');

    const isComfyUIOnline = await checkComfyUIStatus();
    if (isComfyUIOnline) {
      console.log("🎨 ComfyUI is online! Attempting local generation...");
      const comfyResult = await generateWithComfyUI(imagePrompt);
      if (comfyResult) {
        console.log("✅ ComfyUI local generation successful");
        return comfyResult;
      }
    } else {
      console.log("ℹ️ ComfyUI not running, trying other sources...");
    }
  } catch (e) {
    console.warn("⚠️ ComfyUI integration error:", e);
  }

  // === AI Horde (Stable Horde) を試行 ===
  try {
    console.log("🎨 Attempting AI Horde (Stable Diffusion) generation...");

    const hordeResult = await generateWithAIHorde(imagePrompt);
    if (hordeResult) {
      console.log("✅ AI Horde generation successful");
      return hordeResult;
    }
  } catch (e) {
    console.warn("⚠️ AI Horde failed:", e);
  }

  // === Gemini API を試行 ===
  try {
    console.log("🎨 Attempting Gemini image generation...");
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: `Generate a 360-degree background. Theme: "${imagePrompt}". Style: ethereal, moody. NO TEXT.`,
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          console.log("✅ Gemini generation successful");
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (e) {
    console.warn("⚠️ Gemini failed:", e);
  }

  // === 全て失敗 → プロシージャル背景を使用 ===
  console.log("🎨 Using procedural background (reliable fallback)");
  return proceduralImage;
};

// === AI Horde (Stable Horde) API ===
// 無料・CORS対応・商用要確認
const generateWithAIHorde = async (prompt: string): Promise<string | null> => {
  const API_URL = "https://stablehorde.net/api/v2";
  const ANON_KEY = "0000000000"; // 匿名キー（低優先度だが無料）

  try {
    // 1. 生成リクエストを送信
    const submitResponse = await fetch(`${API_URL}/generate/async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
      },
      body: JSON.stringify({
        prompt: `360 degree panoramic environment, ${prompt}, highly detailed, ethereal, moody atmosphere, cinematic lighting`,
        params: {
          sampler_name: "k_euler",
          cfg_scale: 7,
          steps: 20,
          width: 512,
          height: 512,
        },
        nsfw: false,
        censor_nsfw: true,
        models: ["stable_diffusion"],
      }),
    });

    if (!submitResponse.ok) {
      console.warn("AI Horde submit failed:", await submitResponse.text());
      return null;
    }

    const submitData = await submitResponse.json();
    const requestId = submitData.id;
    console.log("🔄 AI Horde request submitted:", requestId);

    // 2. ステータスをポーリング（最大30秒）
    const maxWait = 30000;
    const pollInterval = 2000;
    let waited = 0;

    while (waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      waited += pollInterval;

      const statusResponse = await fetch(`${API_URL}/generate/check/${requestId}`);
      const statusData = await statusResponse.json();

      if (statusData.done) {
        // 3. 完了したら画像を取得
        const resultResponse = await fetch(`${API_URL}/generate/status/${requestId}`);
        const resultData = await resultResponse.json();

        if (resultData.generations?.[0]?.img) {
          const imageUrl = resultData.generations[0].img;
          // 画像URLをData URLに変換
          const imgResponse = await fetch(imageUrl);
          const blob = await imgResponse.blob();
          return await blobToDataUrl(blob);
        }
      }

      console.log(`🔄 AI Horde: waiting... (${waited / 1000}s / ${maxWait / 1000}s)`);
    }

    console.warn("AI Horde: timeout");
    return null;

  } catch (e) {
    console.warn("AI Horde error:", e);
    return null;
  }
};

// Blob を Data URL に変換
const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
