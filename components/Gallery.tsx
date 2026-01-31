import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentWorlds, WorldData } from '../services/firebase';

const Gallery: React.FC = () => {
    const [worlds, setWorlds] = useState<WorldData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWorlds = async () => {
            const data = await getRecentWorlds(20);
            setWorlds(data);
            setIsLoading(false);
        };
        fetchWorlds();
    }, []);

    if (isLoading) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center text-white/30 font-mono text-xs">
                LOADING AETHERIC DATA...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 pt-24 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-12">
                <header className="flex flex-col gap-4 border-b border-white/10 pb-8">
                    <h1 className="text-4xl font-serif tracking-tight">Timeline</h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                        Collective Dreams // Last 20 Generations
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {worlds.map((world) => (
                        <Link
                            key={world.id}
                            to={`/world/${world.id}`}
                            className="group relative aspect-video bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all hover:border-white/40"
                        >
                            {world.imagePrompt ? (
                                // 背景画像を生成していれば表示（現状はWorldDataにbackgroundImageUrlが含まれていれば）
                                // ただし、WorldDataの型定義にbackgroundImageUrlはオプショナルでsimulationParams内にあるか、ルートにあるか要確認
                                // 今回の実装ではAISimulationResponseをフラット化せず保存しているため、world.simulationParamsはパラメータのみ。
                                // world.backgroundImageUrl はルートに追加したプロパティ（saveWorldで保存していないかも？）
                                // -> saveWorldの実装を確認すると、imagePromptは保存しているが、backgroundImageUrlは保存していない可能性がある。
                                // -> とりあえずグラデーションプレビューにする。
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-black group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                                <div className="absolute inset-0 bg-white/5" />
                            )}

                            <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-80 group-hover:opacity-100 transition-opacity">
                                <h3 className="text-lg font-serif tracking-wide mb-2 line-clamp-1 group-hover:text-blue-200 transition-colors">
                                    {world.prompt}
                                </h3>
                                <div className="flex justify-between items-end border-t border-white/10 pt-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] uppercase tracking-wider text-white/50">
                                            {world.creatorName || 'Anonymous'}
                                        </span>
                                        <span className="text-[8px] text-white/30 font-mono">
                                            {world.createdAt?.toDate?.().toLocaleDateString() || 'Just now'}
                                        </span>
                                    </div>
                                    <div className="text-[9px] px-2 py-1 bg-white/10 rounded text-white/70">
                                        {world.simulationParams?.shapeType || 'UNKNOWN'}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {worlds.length === 0 && (
                    <div className="text-center py-20 text-white/20 font-serif italic">
                        At the beginning of time, the void was silent...
                    </div>
                )}
            </div>
        </div>
    );
};

export default Gallery;
