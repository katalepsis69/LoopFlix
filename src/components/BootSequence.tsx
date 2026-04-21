'use client';
import { useState, useEffect, useCallback } from 'react';
import { runFullDetection, setDeviceTier } from '../hooks/useDeviceCapability';

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [loadProgress, setLoadProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING...');

  useEffect(() => {
    async function boot() {
      const { detectedTier } = await runFullDetection();
      setDeviceTier(detectedTier);
      setStatusText('CONNECTING TO ARCHIVE...');

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 12 + 4;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setStatusText('ARCHIVE READY');
          setTimeout(onComplete, 300);
        }
        setLoadProgress(Math.min(progress, 100));
      }, 120);
    }

    boot();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setLoadProgress(100);
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-4">
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#E4002B]/30" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#E4002B]/30" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#E4002B]/30" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#E4002B]/30" />

      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="text-[#E4002B] text-[10px] tracking-[0.5em] mb-2">◈</div>
          <h1 className="text-[#E0E0E0] text-2xl md:text-3xl tracking-[0.4em] font-mono">
            LOOPFLIX
          </h1>
          <div className="text-[#333333] text-[10px] tracking-[0.3em] mt-1">// STREAMING ARCHIVE</div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-2 h-2 ${loadProgress >= 100 ? 'bg-[#00E400]' : 'bg-[#E4002B] animate-pulse'}`} />
            <span className="text-[#666666] text-[10px] tracking-[0.3em]">
              {statusText}
            </span>
          </div>

          <div className="h-2 bg-[#111111] border border-[#1a1a1a] mb-3 overflow-hidden">
            <div
              className="h-full bg-[#E4002B] transition-all duration-200"
              style={{ width: `${loadProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#333333] text-[10px] tracking-[0.2em] font-mono">
              {Math.round(loadProgress)}%
            </span>
            <span className="text-[#333333] text-[10px] tracking-[0.2em]">
              {loadProgress >= 100 ? 'READY' : 'LOADING'}
            </span>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <span className="text-[#222222] text-[9px] tracking-[0.3em]">
              LOOPFLIX ARCHIVE v2.47.1
            </span>
            {loadProgress < 100 && (
              <button
                onClick={handleSkip}
                className="text-[#333333] text-[9px] tracking-[0.3em] hover:text-[#E4002B] transition-colors"
              >
                SKIP BOOT →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
