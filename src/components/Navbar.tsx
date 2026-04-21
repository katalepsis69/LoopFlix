'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useUserStore } from '@/store/useUserStore';
import { useDeviceCapability, TIER_CONFIG } from '../hooks/useDeviceCapability';

const navLinks = [
  { id: 'archive', label: 'ARCHIVE' },
  { id: 'catalog', label: 'CATALOG' },
  { id: 'terminal', label: 'TERMINAL' },
];

function WatchlistBadge() {
  const count = useUserStore((s) => s.watchlist.length);
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-2 bg-[#E4002B] text-white text-[7px] font-bold w-3.5 h-3.5 flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function Navbar() {
  const { currentSection, setCurrentSection, isNavOpen, setIsNavOpen } = useStore();
  const { tier } = useDeviceCapability();

  const navBg = tier === 'high'
    ? 'bg-[#0A0A0A]/95 backdrop-blur-sm'
    : 'bg-[#0A0A0A]';

  const handleNav = (id: string) => {
    setCurrentSection(id);
    setIsNavOpen(false);
  };

  return (
    <>
      {/* Fixed Top Bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${navBg} border-b border-[#333333]`}>
        <div className="flex items-center justify-between px-4 md:px-8 py-3">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => handleNav('archive')}
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-3 h-3 bg-[#E4002B] pulse-red" />
            <span className="text-[#E4002B] text-lg tracking-[0.3em] font-retro text-glow-red">LOOPFLIX</span>
            <span className="text-[#666666] text-sm tracking-widest hidden sm:inline">// ARCHIVE</span>
          </motion.div>

          {/* Center — Horizontal Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`relative px-4 py-1.5 text-[11px] tracking-[0.25em] font-mono transition-all duration-200 glitch-text-hover ${
                  currentSection === link.id
                    ? 'text-[#E4002B]'
                    : 'text-[#555555] hover:text-[#B8B8B8]'
                }`}
              >
                {link.label}
                {currentSection === link.id && (
                  <motion.div
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#E4002B]"
                    layoutId="activeNavDesktop"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Right — Hamburger Menu Button */}
          <button
            className="text-[#B8B8B8] p-2 relative overflow-hidden glitch-flash"
            onClick={() => setIsNavOpen(!isNavOpen)}
          >
            <div className="w-5 flex flex-col gap-1">
              <motion.div
                className="h-px bg-[#E4002B]"
                animate={{ rotate: isNavOpen ? 45 : 0, y: isNavOpen ? 5 : 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.div
                className="h-px bg-[#E4002B]"
                animate={{ opacity: isNavOpen ? 0 : 1 }}
                transition={{ duration: 0.1 }}
              />
              <motion.div
                className="h-px bg-[#E4002B]"
                animate={{ rotate: isNavOpen ? -45 : 0, y: isNavOpen ? -5 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </button>
        </div>

        {/* Mobile Nav — horizontal scroll on small screens */}
        <div className="flex md:hidden items-center gap-1 px-4 pb-2 overflow-x-auto">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`shrink-0 px-3 py-1 text-[10px] tracking-[0.2em] font-mono transition-all duration-200 ${
                currentSection === link.id
                  ? 'text-[#E4002B] border-b border-[#E4002B]'
                  : 'text-[#555555]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* System Status Line */}
        <div className="flex items-center justify-between px-4 md:px-8 py-1 bg-[#0d0d0d] border-t border-[#1a1a1a]">
          <div className="flex items-center gap-4 text-[10px] text-[#666666] tracking-wider">
            <span>SYS: <span className="text-green-600">OPTIMAL</span></span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">ARCHIVE.INTEGRITY: 97.3%</span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">TIER: <span style={{ color: TIER_CONFIG[tier].color }}>{TIER_CONFIG[tier].label}</span></span>
          </div>
          <span className="text-[10px] text-[#666666] tracking-wider blink-cursor">REC</span>
        </div>
      </div>

      {/* Full-Screen Overlay Menu — hamburger */}
      <AnimatePresence>
        {isNavOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-[#0A0A0A]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Scanline sweep overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                className="w-full h-[2px] bg-[#E4002B]/20"
                animate={{ y: ['-100vh', '100vh'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* Grid pattern background */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'linear-gradient(#E4002B 1px, transparent 1px), linear-gradient(90deg, #E4002B 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />

            <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
              {/* Logo at top */}
              <motion.div
                className="absolute top-8 left-4 md:left-8 flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-2 h-2 bg-[#E4002B]" />
                <span className="text-[#E4002B] text-sm tracking-[0.3em] font-retro">LOOPFLIX</span>
              </motion.div>

              {/* Corner decorations */}
              <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#E4002B]/20" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#E4002B]/20" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#E4002B]/20" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#E4002B]/20" />

              {/* Nav Items in overlay */}
              {navLinks.map((item, i) => (
                <motion.button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`relative text-2xl md:text-4xl tracking-[0.4em] font-retro transition-all duration-300 overflow-hidden px-6 py-2 ${
                    currentSection === item.id
                      ? 'text-[#E4002B]'
                      : 'text-[#444444]'
                  } glitch-intense`}
                  initial={{ opacity: 0, x: -40, skewX: -5 }}
                  animate={{ opacity: 1, x: 0, skewX: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <span className="relative z-10">{item.label}</span>
                  {currentSection === item.id && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E4002B]"
                      layoutId="activeNavOverlay"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>
              ))}

              {/* Divider */}
              <motion.div
                className="w-32 h-px bg-gradient-to-r from-transparent via-[#E4002B]/30 to-transparent my-2"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              />

              {/* Signal Lost */}
              <motion.button
                onClick={() => { setIsNavOpen(false); useStore.getState().setSignalLostOpen(true); }}
                className="relative text-xl md:text-2xl tracking-[0.4em] font-retro text-[#E4002B]/60 glitch-intense px-6 py-2 overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <span className="relative z-10">◈ SIGNAL LOST</span>
                <div className="absolute inset-0 bg-[#E4002B]/0 hover:bg-[#E4002B]/5 transition-colors" />
              </motion.button>

              {/* Spacer */}
              <div className="h-6" />

              {/* Utility Items */}
              <motion.button
                onClick={() => { setIsNavOpen(false); useStore.getState().setWatchlistPanelOpen(true); }}
                className="relative text-base tracking-[0.3em] text-[#444444] font-retro flex items-center gap-3 glitch-text-hover px-4 py-2 overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <span className="relative">
                  ♥ WATCHLIST
                  <WatchlistBadge />
                </span>
              </motion.button>

              <motion.button
                onClick={() => { setIsNavOpen(false); useStore.getState().setSettingsOpen(true); }}
                className="text-base tracking-[0.3em] text-[#333333] font-retro glitch-text-hover px-4 py-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.45, duration: 0.3 }}
              >
                ⚙ SETTINGS
              </motion.button>

              {/* Bottom info */}
              <motion.div
                className="absolute bottom-8 left-4 md:left-8 text-[9px] text-[#333333] tracking-[0.2em] font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div>LOOPFLIX://ARCHIVE — v1.5.0</div>
                <div className="mt-1">SYS.TIER: <span style={{ color: TIER_CONFIG[tier].color }}>{TIER_CONFIG[tier].label}</span></div>
              </motion.div>

              <motion.div
                className="absolute bottom-8 right-4 md:right-8 text-[9px] text-[#333333] tracking-[0.2em] font-mono text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
              >
                <div>ESC CLOSE</div>
                <div className="mt-1">← → NAVIGATE</div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
