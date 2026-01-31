
import React, { useState, useEffect, useRef } from 'react';
import { SimulationParams } from '../types';
import { audioEngine } from '../services/audioEngine';

interface UIOverlayProps {
  params: SimulationParams;
  onGenerate: (prompt: string) => void;
  onParamChange: (newParams: Partial<SimulationParams>) => void;
  isLoading: boolean;
  description: string;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ params, onGenerate, onParamChange, isLoading, description }) => {
  const [input, setInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const visualizerRef = useRef<HTMLCanvasElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) onGenerate(input);
  };

  useEffect(() => {
    const canvas = visualizerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let anim: number;
    const draw = () => {
      anim = requestAnimationFrame(draw);
      const data = audioEngine.getAnalyserData();
      if (!data) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / (data.length / 2)) * 2;
      for (let i = 0; i < data.length / 2; i++) {
        const h = (data[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(255, 255, 255, ${data[i] / 255 * 0.4 + 0.1})`;
        ctx.fillRect(i * barWidth, canvas.height - h, barWidth - 1, h);
      }
    };
    draw();
    return () => cancelAnimationFrame(anim);
  }, []);

  return (
    <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none z-30 font-sans">
      {/* Premium HUD Header */}
      <div className="flex justify-between items-start">
        <div className="max-w-[300px] border-l border-white/40 pl-5 py-1">
          <h2 className="text-[7px] uppercase tracking-[0.6em] font-bold text-white/30 mb-2">SYNTROPY_OS_V2.5.1</h2>
          <p className="text-white/80 text-[10px] font-serif italic leading-relaxed tracking-tight">{description}</p>
        </div>
        <div className="flex flex-col items-end gap-4 pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[6px] text-white/20 uppercase tracking-[0.4em] mb-1">Spectral_Intensity</div>
              <canvas ref={visualizerRef} width={140} height={20} className="opacity-60" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onParamChange({ cameraMode: params.cameraMode === 'INTERACTIVE' ? 'ORBIT' : 'INTERACTIVE' })}
              className={`text-[8px] border border-white/20 px-4 py-1.5 transition-all tracking-[0.3em] font-bold ${params.cameraMode === 'INTERACTIVE' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
            >
              CAM_DRIVE
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`text-[8px] border border-white/20 px-4 py-1.5 transition-all tracking-[0.3em] font-bold ${showAdvanced ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              TUNING_CORE
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Parameter Matrix */}
      {showAdvanced && (
        <div className="absolute right-8 top-40 w-52 backdrop-blur-3xl bg-black/80 border border-white/10 p-5 pointer-events-auto text-[7px] tracking-widest text-white/40 uppercase font-mono animate-in fade-in slide-in-from-right-2">
          <div className="mb-5 border-b border-white/20 pb-1 font-bold text-white/60">MORPHOLOGY_STATE</div>
          <Slider label="Fusion_Bias" val={params.fusionFactor} min={0} max={1} step={0.01} onChange={v => onParamChange({ fusionFactor: v })} />
          <Slider label="Entropy_Scale" val={params.mutationScale} min={1} max={20} step={0.1} onChange={v => onParamChange({ mutationScale: v })} />
          <Slider label="Complexity" val={params.objectCount} min={1} max={20} step={1} onChange={v => onParamChange({ objectCount: v })} />

          <div className="mt-6 mb-5 border-b border-white/20 pb-1 font-bold text-white/60">LIGHT_PHYSICS</div>
          <Slider label="Refract_Idx" val={params.ior} min={1} max={2.4} step={0.01} onChange={v => onParamChange({ ior: v })} />
          <Slider label="Attenuation" val={params.thickness} min={0.1} max={15} step={0.1} onChange={v => onParamChange({ thickness: v })} />
          <Slider label="Spec_Boost" val={params.shadowIntensity} min={0} max={5} step={0.1} onChange={v => onParamChange({ shadowIntensity: v })} />
          <Slider label="Iridescence" val={params.iridescenceIntensity ?? 0.5} min={0} max={1} step={0.01} onChange={v => onParamChange({ iridescenceIntensity: v })} />

          <div className="mt-6 mb-3 border-b border-white/20 pb-1 font-bold text-cyan-400/80">
            <span className="text-white/40">SOUND_MATRIX</span>
          </div>
          <div className="flex justify-between mb-2 text-[6px]">
            <span className="text-blue-300/60">SAKAMOTO</span>
            <span className="text-pink-300/60">KOMURO</span>
          </div>
          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={0.3}
              className="w-full h-[2px] bg-gradient-to-r from-blue-400/40 via-white/40 to-pink-400/40 appearance-none cursor-pointer accent-white"
              disabled
              title="Music style is AI-controlled"
            />
            <div className="text-[5px] text-center mt-1 text-white/20">AI_CONTROLLED</div>
          </div>
        </div>
      )}

      {/* Central Input Frame */}
      <div className="flex flex-col items-center gap-6">
        <form onSubmit={handleSubmit} className="w-full max-w-xl pointer-events-auto group">
          <div className="relative overflow-hidden bg-black/50 backdrop-blur-2xl border border-white/10 p-1.5 transition-all duration-700 focus-within:border-white/40">
            <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-white/40" />
            <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-white/40" />
            <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-white/40" />
            <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-white/40" />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ENTER SYNTROPY SEED"
              className="w-full bg-transparent text-center text-white placeholder-white/10 focus:outline-none py-5 font-serif text-2xl tracking-tighter"
              disabled={isLoading}
            />
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] bg-white transition-all duration-[3s] ease-out ${isLoading ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
          </div>
          <button type="submit" disabled={isLoading} className="mt-8 mx-auto flex flex-col items-center gap-4 opacity-30 hover:opacity-100 transition-all group-hover:opacity-60">
            <div className={`w-[0.5px] h-10 bg-white transition-all ${isLoading ? 'h-16 animate-pulse' : ''}`} />
            <span className="text-[9px] uppercase tracking-[1.2em] font-bold ml-[1.2em]">Confirm_Matter</span>
          </button>
        </form>
      </div>

      {/* Footer System Status */}
      <div className="flex justify-between items-end opacity-20 text-[6px] tracking-[1em] font-mono">
        <div className="flex gap-8">
          <span>// SYNTROPY_X.2.5</span>
          <span>AETHER_LAYER: {params.shapeType}</span>
        </div>
        <span>MATTER_SYNTH_ACTIVE //</span>
      </div>
    </div>
  );
};

const Slider = ({ label, val, min, max, step, onChange }: any) => (
  <div className="mb-3">
    <div className="flex justify-between mb-1.5 opacity-60"><span>{label}</span><span className="font-mono">{val.toFixed(2)}</span></div>
    <input type="range" min={min} max={max} step={step} value={val} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-[0.5px] bg-white/20 appearance-none cursor-pointer accent-white" />
  </div>
);

export default UIOverlay;
