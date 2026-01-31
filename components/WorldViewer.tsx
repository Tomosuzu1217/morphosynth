import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Visualizer3D from './Visualizer3D';
import { getWorld, WorldData } from '../services/firebase';
import { audioEngine } from '../services/audioEngine';
import { AISimulationResponse } from '../types';

const WorldViewer: React.FC = () => {
    const { worldId } = useParams<{ worldId: string }>();
    const [world, setWorld] = useState<WorldData | null>(null);
    const [params, setParams] = useState<AISimulationResponse['simulation'] | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!worldId) return;
        const load = async () => {
            try {
                const data = await getWorld(worldId);
                if (data) {
                    setWorld(data);
                    setParams(data.simulationParams);
                } else {
                    setError('World not found in the aether...');
                }
            } catch (e) {
                setError('Connection lost...');
                console.error(e);
            }
        };
        load();
    }, [worldId]);

    const handleStart = () => {
        if (!world) return;
        setHasStarted(true);
        audioEngine.init().then(() => audioEngine.update(world.soundParams));
    };

    if (error) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center text-red-400/50 font-mono text-xs">
                ERROR: {error}
            </div>
        );
    }

    if (!world || !params) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center text-white/30 font-mono text-xs">
                LOADING MATTER STATE...
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden selection:bg-white/10">
            <Visualizer3D params={params} backgroundUrl={world.backgroundImageUrl} /> {/* backgroundImageUrlの扱いは要修正 */}

            {!hasStarted && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-[1s]">
                    <div className="flex flex-col items-center gap-8 text-center px-12 animate-in fade-in duration-1000">
                        <div className="space-y-4">
                            <h1 className="text-white text-4xl md:text-6xl tracking-tighter leading-none font-serif font-light opacity-95">
                                {world.prompt}
                            </h1>
                            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono">
                                Created by {world.creatorName || 'Anonymous'}
                            </p>
                        </div>

                        <button
                            onClick={handleStart}
                            className="px-8 py-3 border border-white/20 bg-white/5 hover:bg-white/10 text-xs text-white uppercase tracking-[0.3em] transition-all"
                        >
                            Enter World
                        </button>
                    </div>
                </div>
            )}

            {/* 簡易オーバーレイ（パラメータ表示なし、タイトルのみ） */}
            {hasStarted && (
                <div className="absolute top-8 left-8 z-40 pointer-events-none">
                    <h2 className="text-white text-2xl font-serif">{world.prompt}</h2>
                    <p className="text-[10px] text-white/40 mt-1 max-w-sm leading-relaxed">
                        {world.description}
                    </p>
                </div>
            )}
        </div>
    );
};

export default WorldViewer;
