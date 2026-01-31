import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Visualizer3D from './Visualizer3D';
import UIOverlay from './UIOverlay';
import { generateSimulation, generateWorldImage, setApiKey, hasApiKey, clearApiKey } from '../services/geminiService';
import { audioEngine } from '../services/audioEngine';
import { saveSession, saveWorld, auth } from '../services/firebase';
import { AISimulationResponse, ShapeType, SimulationParams } from '../types';

const INITIAL_DATA: AISimulationResponse = {
    simulation: {
        shapeType: ShapeType.LEVITROPE,
        colorPalette: ['#4a4a6a', '#3a3a5a', '#2a2a4a', '#8a6090'],
        rotationSpeed: 0.2,
        mutationScale: 5.0,
        complexity: 12,
        roughness: 0.15,
        metalness: 0.85,
        ior: 1.8,
        clearcoat: 1.0,
        transmission: 0.3,
        thickness: 3.0,
        viscosity: 0.92,
        reflectivity: 0.9,
        wireframe: false,
        bloomIntensity: 0.08,
        environmentType: 'STUDIO',
        cameraMode: 'ORBIT',
        attenuationColor: '#1a1a2e',
        attenuationDistance: 3.0,
        anisotropy: 0.8,
        anisotropyRotation: 0.0,
        specularIntensity: 1.2,
        specularColor: '#e0e0e0',
        emissiveColor: '#000000',
        emissiveIntensity: 0.0,
        audioReactivity: 0.7,
        levitationScale: 2.5,
        particleDensity: 0.5,
        voxelScale: 0.5,
        shadowIntensity: 1.5,
        objectCount: 8,
        fusionFactor: 0.35,
        iridescenceIntensity: 0.5
    },
    sound: {
        baseFrequency: 55.0,
        oscillatorType: 'sine',
        filterFrequency: 400,
        reverbWetness: 0.85,
        distortionAmount: 0.01,
        attack: 2.0,
        release: 12.0,
        rhythmSpeed: 0.05,
        musicalScale: [55.0, 65.4, 73.4, 82.4, 98.0, 110.0],
        harmonyType: 'AMBIENT',
        glitchAmount: 0.05,
        musicStyle: 'SAKAMOTO',
        styleRatio: 0.2,  // 坂本寄り
        bpm: 70,
        gateIntensity: 0.1
    },
    description: "EPHEMORA_V1.0: 変容を待つ... デジタルの儚さが形を成す...",
    imagePrompt: "ethereal dark void, liquid mercury sculpture dissolving into particles, cinematic chiaroscuro lighting, melancholic digital farewell"
};

const WorldCreator: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<AISimulationResponse>(INITIAL_DATA);
    const [isLoading, setIsLoading] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isApiKeySet, setIsApiKeySet] = useState(false);
    const [apiKeyError, setApiKeyError] = useState('');
    const [currentPrompt, setCurrentPrompt] = useState('');

    // ページロード時にAPIキーをクリア
    useEffect(() => {
        clearApiKey();
        setIsApiKeySet(false);
    }, []);

    const handleApiKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKeyInput.trim().length < 10) {
            setApiKeyError('有効なAPIキーを入力してください');
            return;
        }
        setApiKey(apiKeyInput.trim());
        setIsApiKeySet(true);
        setApiKeyError('');
        setApiKeyInput('');
    };

    const handleGenerate = async (prompt: string) => {
        if (!hasApiKey()) {
            setIsApiKeySet(false);
            return;
        }
        setIsLoading(true);
        setCurrentPrompt(prompt);
        try {
            const result = await generateSimulation(prompt);
            try {
                const imageUrl = await generateWorldImage(result.imagePrompt);
                result.backgroundImageUrl = imageUrl;
            } catch (imgErr) { console.warn("Image synthesis failed", imgErr); }

            setData(result);
            if (hasStarted) {
                await audioEngine.update(result.sound);
                console.log('Music updated with new params');
            }

            // 自動保存（ローカル履歴）
            try {
                await saveSession(prompt, result);
            } catch (saveErr) { console.warn("Session save failed", saveErr); }

            // ユーザーがログインしていれば、自動的にWorldとしても保存（オプション）
            // 今回は明示的な保存ボタンを提供する設計にするため、ここでは自動保存しない

        } catch (err: unknown) {
            console.error("Synthesis error:", err);
            if (err instanceof Error && err.message.includes('API')) {
                clearApiKey();
                setIsApiKeySet(false);
                setApiKeyError('APIキーが無効です。再度入力してください。');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleParamChange = (newParams: Partial<SimulationParams>) => {
        setData(prev => ({ ...prev, simulation: { ...prev.simulation, ...newParams } }));
    };

    const handleStart = async () => {
        setHasStarted(true);
        // まず初期化（Autoplay制限対応）
        const success = await audioEngine.init();
        if (success) {
            // 初期化成功後に音楽を開始
            await audioEngine.update(data.sound);
            console.log('Music started with params:', data.sound);
        } else {
            console.warn('Audio initialization failed');
        }
    };

    const handlePublish = async () => {
        if (!auth.currentUser) {
            alert("ログインが必要です");
            return;
        }
        try {
            const worldId = await saveWorld(auth.currentUser, data, currentPrompt || "Untitled World");
            alert("世界を公開しました！");
            navigate(`/world/${worldId}`);
        } catch (e) {
            alert("公開に失敗しました");
            console.error(e);
        }
    };

    // APIキー入力画面
    if (!isApiKeySet) {
        return (
            <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center">
                <div className="flex flex-col items-center gap-12 text-center px-8 max-w-md">
                    <div className="space-y-4">
                        <h1 className="text-white text-4xl md:text-6xl tracking-tighter leading-none font-serif font-light opacity-95">
                            SYNTR<span className="italic font-normal">O</span>PY
                        </h1>
                        <p className="text-[8px] uppercase tracking-[1.5em] font-bold text-white/20 ml-[1.5em] font-sans">
                            AETHERIC MATTER ENGINE
                        </p>
                    </div>

                    <form onSubmit={handleApiKeySubmit} className="w-full space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 block">
                                Google AI Studio API Key
                            </label>
                            <input
                                type="password"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="AIza..."
                                className="w-full bg-white/5 border border-white/20 text-white placeholder-white/20 
                         px-4 py-3 text-sm font-mono focus:outline-none focus:border-white/50
                         transition-all duration-300"
                                autoComplete="off"
                                autoFocus
                            />
                            {apiKeyError && (
                                <p className="text-red-400/80 text-[10px] tracking-wide">{apiKeyError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full border border-white/30 py-3 text-[10px] uppercase tracking-[0.5em] 
                       text-white/60 hover:text-white hover:border-white/60 hover:bg-white/5
                       transition-all duration-300"
                        >
                            Initialize_System
                        </button>
                        <p className="text-[8px] text-white/20 leading-relaxed">
                            ※ APIキーはメモリ内のみで管理されます。<br />
                            ページを閉じる・リフレッシュすると自動的に消去されます。
                        </p>
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-white/30 hover:text-white/60 underline transition-colors block"
                        >
                            APIキーを取得 →
                        </a>
                    </form>
                    <div className="absolute bottom-8 text-[7px] uppercase tracking-[0.5em] text-white/10 font-mono">
                        OS: SYNTROPY_V2.5 // SECURE_SESSION
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden selection:bg-white/10">
            <Visualizer3D params={data.simulation} backgroundUrl={data.backgroundImageUrl} />

            {!hasStarted && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black transition-opacity duration-[2.5s]">
                    {/* Start Screen UI ... (same as App.tsx) */}
                    <div className="flex flex-col items-center gap-16 text-center px-12 animate-in fade-in duration-1000">
                        <div className="space-y-6">
                            <h1 className="text-white text-6xl md:text-[9rem] tracking-tighter leading-none font-serif font-light opacity-95">
                                SYNTR<span className="italic font-normal">O</span>PY
                            </h1>
                            <p className="text-[9px] uppercase tracking-[2.2em] font-bold text-white/20 ml-[2.2em] font-sans">
                                AETHERIC MATTER ENGINE
                            </p>
                        </div>
                        <button
                            onClick={handleStart}
                            className="group flex flex-col items-center gap-8 mt-16 transition-transform hover:scale-105"
                        >
                            <div className="w-[0.5px] h-20 bg-white/10 transition-all group-hover:h-28 group-hover:bg-white/60" />
                            <span className="text-[8px] uppercase tracking-[1.2em] font-bold text-white/30 group-hover:text-white transition-opacity">
                                Synchronize_Aether
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {hasStarted && (
                <>
                    <UIOverlay
                        params={data.simulation}
                        onGenerate={handleGenerate}
                        onParamChange={handleParamChange}
                        isLoading={isLoading}
                        description={data.description}
                    />
                    {/* 公開ボタン */}
                    {auth.currentUser && (
                        <button
                            onClick={handlePublish}
                            className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 
                        border border-white/20 rounded text-[9px] text-white hover:bg-white/10 
                        transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(100,200,255,0.3)]"
                        >
                            Publish World
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default WorldCreator;
