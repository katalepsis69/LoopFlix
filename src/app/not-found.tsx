import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — Signal Lost",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Glitch text */}
        <div className="relative mb-8">
          <h1 className="text-6xl md:text-8xl font-retro text-[#E4002B] tracking-wider text-glow-red">
            SIGNAL
          </h1>
          <h1 className="text-6xl md:text-8xl font-retro text-[#E4002B] tracking-wider">
            LOST
          </h1>
          {/* Animated scan line */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="w-full h-[2px] bg-[#E4002B]/30"
              style={{
                animation: "scan 3s linear infinite",
              }}
            />
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <div className="text-[#444444] text-[10px] tracking-[0.3em] font-mono">
            ERROR CODE: 404
          </div>
          <div className="text-[#666666] text-xs font-mono tracking-wider">
            ARCHIVE NODE NOT FOUND
          </div>
          <div className="text-[#444444] text-[10px] font-mono tracking-wider">
            The requested record does not exist or has been moved.
          </div>
        </div>

        {/* Diagnostic output */}
        <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4 mb-8 text-left font-mono text-[10px] space-y-1">
          <div className="text-[#444444]">DIAGNOSTIC OUTPUT:</div>
          <div className="text-[#666666]">▸ CONNECTION: <span className="text-green-400">ACTIVE</span></div>
          <div className="text-[#666666]">▸ ARCHIVE STATUS: <span className="text-[#E4002B]">RECORD MISSING</span></div>
          <div className="text-[#666666]">▸ REDIRECT: <span className="text-yellow-500">RECOMMENDED</span></div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-[#E4002B] text-white text-[10px] tracking-[0.3em] font-mono hover:bg-[#E4002B]/80 transition-colors"
          >
            RETURN TO ARCHIVE
          </Link>
          <Link
            href="/catalog"
            className="px-6 py-3 border border-[#1a1a1a] text-[#666666] text-[10px] tracking-[0.3em] font-mono hover:border-[#E4002B]/30 hover:text-[#E4002B] transition-colors"
          >
            BROWSE CATALOG
          </Link>
        </div>

        <div className="mt-8 text-[#333333] text-[9px] tracking-wider font-mono">
          LOOPFLIX // ARCHIVE — ALL RECORDS INDEXED
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
      `}} />
    </div>
  );
}
