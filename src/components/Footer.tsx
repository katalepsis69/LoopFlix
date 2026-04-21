'use client';
import { motion } from 'framer-motion';

export default function Footer() {
  return (
    <footer className="relative border-t border-[#1a1a1a] mt-16">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-[#E4002B] pulse-red" />
              <span className="text-[#E4002B] text-lg tracking-[0.3em] text-glow-red">
                LOOPFLIX
              </span>
            </div>
            <p className="text-[#444444] text-xs tracking-wider leading-relaxed">
              ARCHIVE SYSTEM FOR CINEMATIC<br />
              RECORDS AND TRANSMISSIONS<br />
              EST. CYCLE 47
            </p>
          </div>

          {/* Links */}
          <div>
            <div className="text-[10px] text-[#E4002B] tracking-[0.3em] mb-4 flex items-center gap-2">
              <div className="w-4 h-px bg-[#E4002B]" />
              NAVIGATION
            </div>
            <div className="space-y-2">
              {['ARCHIVE', 'CATALOG', 'TERMINAL'].map((link) => (
                <motion.div
                  key={link}
                  className="text-[#444444] text-xs tracking-[0.2em] cursor-pointer hover:text-[#E4002B] transition-colors"
                  whileHover={{ x: 4 }}
                >
                  {'> '}{link}
                </motion.div>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div>
            <div className="text-[10px] text-[#E4002B] tracking-[0.3em] mb-4 flex items-center gap-2">
              <div className="w-4 h-px bg-[#E4002B]" />
              SYSTEM
            </div>
            <div className="space-y-2 text-[#444444] text-[10px] tracking-wider">
              <div>ARCHIVE.VERSION: <span className="text-[#666666]">2.47.1</span></div>
              <div>RECORDS.TOTAL: <span className="text-[#666666]">12</span></div>
              <div>SYSTEM.STATUS: <span className="text-green-600">OPERATIONAL</span></div>
              <div>LAST.UPDATE: <span className="text-[#666666]">CYCLE 47.12.03</span></div>
              <div>UPTIME: <span className="text-[#666666]">847:23:41</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#1a1a1a] px-4 md:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="text-[10px] text-[#333333] tracking-[0.2em]">
          LOOPFLIX ARCHIVE SYSTEM // ALL RIGHTS RESERVED
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#333333] tracking-wider">
          <span>PROTOCOL: AES-256</span>
          <span>|</span>
          <span>ENCRYPTION: ACTIVE</span>
          <span>|</span>
          <span className="text-[#E4002B]/50">■</span>
        </div>
      </div>
    </footer>
  );
}
