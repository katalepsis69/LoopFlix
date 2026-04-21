'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useDeviceCapability,
  setDeviceTier,
  resetDeviceTier,
  TIER_CONFIG,
  type DeviceTier,
  // Font settings
  type FontSize,
  type FontFamily,
  FONT_SIZE_CONFIG,
  FONT_FAMILY_CONFIG,
  getCachedFontSize,
  getCachedFontFamily,
  setFontSettings,
  // Data saver
  getDataSaver,
  setDataSaver,
  type DataSaverConfig,
} from '../hooks/useDeviceCapability';
import { useStore } from '@/store/useStore';

export default function Settings() {
  const { tier, cpuCores, memory, networkType, fps, gpuRenderer, pixelRatio, screenWidth } = useDeviceCapability();
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  // ─── Font state ───────────────────────────────────
  const [fontSize, setFontSize] = useState<FontSize>(getCachedFontSize());
  const [fontFamily, setFontFamily] = useState<FontFamily>(getCachedFontFamily());

  // ─── Tier state ───────────────────────────────────
  const [selectedTier, setSelectedTier] = useState<DeviceTier>(tier);
  const [showTierConfirm, setShowTierConfirm] = useState(false);

  // ─── Data saver state ─────────────────────────────
  const [dataSaver, setDataSaverState] = useState<DataSaverConfig>(getDataSaver());

  // ─── Active section for mobile accordion ──────────
  const [activeSection, setActiveSection] = useState<string | null>('fonts');

  // ─── Listen for external changes ──────────────────
  useEffect(() => {
    const handler = () => {
      setFontSize(getCachedFontSize());
      setFontFamily(getCachedFontFamily());
      setDataSaverState(getDataSaver());
    };
    window.addEventListener('loopflix_fonts_changed', handler);
    window.addEventListener('loopflix_datasaver_changed', handler);
    return () => {
      window.removeEventListener('loopflix_fonts_changed', handler);
      window.removeEventListener('loopflix_datasaver_changed', handler);
    };
  }, []);

  // ─── Handlers ─────────────────────────────────────
  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    setFontSettings(size, fontFamily);
  };

  const handleFontFamilyChange = (family: FontFamily) => {
    setFontFamily(family);
    setFontSettings(fontSize, family);
  };

  const handleTierChange = (newTier: DeviceTier) => {
    if (newTier === tier) return;
    setSelectedTier(newTier);
    setShowTierConfirm(true);
  };

  const handleTierConfirm = () => {
    setDeviceTier(selectedTier);
    setShowTierConfirm(false);
    setTimeout(() => setSettingsOpen(false), 300);
  };

  const handleDataSaverToggle = () => {
    const newEnabled = !dataSaver.enabled;
    setDataSaver({ enabled: newEnabled });
    setDataSaverState({ ...dataSaver, enabled: newEnabled });
  };

  const handleDataSaverOption = (key: keyof DataSaverConfig, value: boolean) => {
    const updated = { ...dataSaver, [key]: value };
    setDataSaver(updated);
    setDataSaverState(updated);
  };

  const handleReset = () => {
    resetDeviceTier();
    window.location.reload();
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  if (!settingsOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-[#0A0A0A]/95 flex items-center justify-center p-4"
        onClick={() => !showTierConfirm && setSettingsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl bg-[#0d0d0d] border border-[#1a1a1a] max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a] sticky top-0 bg-[#0d0d0d] z-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#E4002B]" />
              <h2 className="text-[#E0E0E0] text-sm tracking-[0.4em]">SETTINGS</h2>
            </div>
            <button
              onClick={() => !showTierConfirm && setSettingsOpen(false)}
              className="text-[#444444] hover:text-[#E4002B] transition-colors text-xs tracking-wider"
            >
              ✕ CLOSE
            </button>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* SECTION 1: FONTS                          */}
          {/* ═══════════════════════════════════════════ */}
          <SectionCollapsible
            title="TYPOGRAPHY"
            icon="T"
            isOpen={activeSection === 'fonts'}
            onToggle={() => toggleSection('fonts')}
          >
            {/* Font Size */}
            <div className="mb-5">
              <div className="text-[10px] text-[#333333] tracking-[0.3em] mb-3">TEXT SIZE</div>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(FONT_SIZE_CONFIG) as [FontSize, typeof FONT_SIZE_CONFIG[FontSize]][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleFontSizeChange(key)}
                    className={`p-2.5 border text-center transition-all duration-200 ${
                      fontSize === key
                        ? 'border-[#E4002B]/60 bg-[#E4002B]/10'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333333]'
                    }`}
                  >
                    <div
                      className="text-[#B8B8B8] mb-1 truncate"
                      style={{ fontSize: config.size }}
                    >
                      Aa
                    </div>
                    <div className={`text-[8px] tracking-[0.2em] ${fontSize === key ? 'text-[#E4002B]' : 'text-[#444444]'}`}>
                      {config.label}
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-[#333333] text-[8px] tracking-[0.15em] mt-2">
                {FONT_SIZE_CONFIG[fontSize].description}
              </div>
            </div>

            {/* Font Family */}
            <div className="mb-5">
              <div className="text-[10px] text-[#333333] tracking-[0.3em] mb-3">FONT FAMILY</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(FONT_FAMILY_CONFIG) as [FontFamily, typeof FONT_FAMILY_CONFIG[FontFamily]][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleFontFamilyChange(key)}
                    className={`p-3 border text-left transition-all duration-200 ${
                      fontFamily === key
                        ? 'border-[#E4002B]/60 bg-[#E4002B]/10'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333333]'
                    }`}
                  >
                    <div
                      className="text-[#E0E0E0] text-sm mb-1 truncate"
                      style={{ fontFamily: config.css }}
                    >
                      LOOPFLIX
                    </div>
                    <div
                      className={`text-[9px] tracking-[0.1em] mb-1 ${
                        fontFamily === key ? 'text-[#E4002B]' : 'text-[#666666]'
                      }`}
                    >
                      {config.label}
                    </div>
                    <div className="text-[#333333] text-[7px] leading-tight">
                      {config.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="border border-[#1a1a1a] bg-[#080808] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[9px] text-[#333333] tracking-[0.3em]">PREVIEW</div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00E400]" />
                  <span className="text-[8px] text-[#444444] tracking-[0.2em]">LIVE</span>
                </div>
              </div>
              <div
                className="space-y-2"
                style={{
                  fontFamily: FONT_FAMILY_CONFIG[fontFamily].css,
                  fontSize: FONT_SIZE_CONFIG[fontSize].size,
                }}
              >
                <div className="text-[#E0E0E0] text-lg" style={{ fontFamily: FONT_FAMILY_CONFIG[fontFamily].css }}>
                  ◈ LOOPFLIX // ARCHIVE
                </div>
                <div className="text-[#B8B8B8]">
                  The archive contains 24,847 records spanning 142 years of cinematic data.
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#E4002B]">◆ ARCHIVE</span>
                  <span className="text-[#FFB800]">◇ CATALOG</span>
                  <span className="text-[#666666]">○ TRANSMISSIONS</span>
                </div>
                <div className="text-[#444444] text-xs">
                  RECORD TX-0042 — STATUS: ACTIVE — CLEARANCE: LEVEL 3
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 flex-1 bg-[#1a1a1a]">
                    <div className="h-full bg-[#E4002B] w-3/4" />
                  </div>
                  <span className="text-[#666666] text-xs">75%</span>
                </div>
              </div>
            </div>
          </SectionCollapsible>

          {/* ═══════════════════════════════════════════ */}
          {/* SECTION 2: PERFORMANCE TIER (DROPDOWN)     */}
          {/* ═══════════════════════════════════════════ */}
          <SectionCollapsible
            title="PERFORMANCE"
            icon="⚡"
            isOpen={activeSection === 'performance'}
            onToggle={() => toggleSection('performance')}
          >
            {/* Dropdown */}
            <div className="mb-4">
              <div className="text-[10px] text-[#333333] tracking-[0.3em] mb-2">DEVICE TIER</div>
              <div className="relative">
                <select
                  value={selectedTier}
                  onChange={(e) => handleTierChange(e.target.value as DeviceTier)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#B8B8B8] text-[11px] tracking-[0.2em] p-3 pr-10 appearance-none cursor-pointer hover:border-[#333333] focus:border-[#E4002B]/50 focus:outline-none transition-colors"
                  style={{
                    backgroundImage: 'none',
                  }}
                >
                  {(['high', 'medium', 'low', 'ultra_low'] as DeviceTier[]).map((t) => (
                    <option key={t} value={t}>
                      {TIER_CONFIG[t].bars} ■ — {TIER_CONFIG[t].label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#444444]">
                  ▼
                </div>
              </div>
              {/* Current tier info */}
              <div className="mt-3 p-3 border border-[#1a1a1a] bg-[#080808]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-[#333333] tracking-[0.2em]">CURRENT TIER</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-3 h-1.5"
                          style={{
                            backgroundColor: i < TIER_CONFIG[tier].bars
                              ? TIER_CONFIG[tier].color
                              : '#1a1a1a',
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-[10px] tracking-[0.2em]"
                      style={{ color: TIER_CONFIG[tier].color }}
                    >
                      {TIER_CONFIG[tier].label}
                    </span>
                  </div>
                </div>
                <div className="text-[#444444] text-[9px] tracking-[0.1em]">
                  {TIER_CONFIG[tier].description}
                </div>
                {/* What's enabled */}
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <TierFeature label="Scanlines" enabled={tier === 'high'} />
                  <TierFeature label="Blur effects" enabled={tier === 'high'} />
                  <TierFeature label="Animations" enabled={tier === 'high' || tier === 'medium'} />
                  <TierFeature label="Full-size images" enabled={tier === 'high' || tier === 'medium'} />
                  <TierFeature label="Grid: 20 items" enabled={tier !== 'ultra_low'} />
                  <TierFeature label="Motion effects" enabled={tier === 'high'} />
                </div>
              </div>
            </div>

            {/* Confirm tier change */}
            <AnimatePresence>
              {showTierConfirm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 border border-[#FFB800]/30 bg-[#FFB800]/5 flex items-center justify-between">
                    <span className="text-[#FFB800] text-[10px] tracking-[0.2em]">
                      CHANGE TIER TO {TIER_CONFIG[selectedTier].label}?
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleTierConfirm}
                        className="px-3 py-1 bg-[#E4002B] text-white text-[9px] tracking-[0.2em] hover:bg-[#E4002B]/80 transition-colors"
                      >
                        CONFIRM
                      </button>
                      <button
                        onClick={() => setShowTierConfirm(false)}
                        className="px-3 py-1 border border-[#333333] text-[#666666] text-[9px] tracking-[0.2em] hover:text-[#E0E0E0] transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Device info */}
            <div className="mt-3">
              <div className="text-[9px] text-[#333333] tracking-[0.3em] mb-2">DEVICE INFORMATION</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <InfoRow label="CPU" value={cpuCores ? `${cpuCores} CORES` : 'UNKNOWN'} />
                <InfoRow label="RAM" value={memory ? `${memory} GB` : 'UNKNOWN'} />
                <InfoRow label="GPU" value={gpuRenderer ? (gpuRenderer.length > 20 ? gpuRenderer.substring(0, 20) + '...' : gpuRenderer) : 'UNKNOWN'} />
                <InfoRow label="NETWORK" value={(networkType ?? 'UNKNOWN').toUpperCase()} />
                <InfoRow label="FPS" value={fps ? `${fps}` : 'N/A'} />
                <InfoRow label="SCREEN" value={`${screenWidth}px @ ${pixelRatio}x`} />
              </div>
            </div>
          </SectionCollapsible>

          {/* ═══════════════════════════════════════════ */}
          {/* SECTION 3: DATA SAVER                      */}
          {/* ═══════════════════════════════════════════ */}
          <SectionCollapsible
            title="DATA SAVER"
            icon="📶"
            isOpen={activeSection === 'datasaver'}
            onToggle={() => toggleSection('datasaver')}
          >
            {/* Main toggle */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[#B8B8B8] text-[11px] tracking-[0.2em]">DATA SAVER MODE</div>
                <div className="text-[#333333] text-[8px] tracking-[0.15em] mt-0.5">
                  Reduce bandwidth usage — ideal for mobile data or slow connections
                </div>
              </div>
              <button
                onClick={handleDataSaverToggle}
                className={`relative w-12 h-6 border transition-all duration-200 ${
                  dataSaver.enabled
                    ? 'border-[#FFB800]/60 bg-[#FFB800]/10'
                    : 'border-[#1a1a1a] bg-[#0a0a0a]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 transition-all duration-200 ${
                    dataSaver.enabled
                      ? 'left-6.5 bg-[#FFB800]'
                      : 'left-0.5 bg-[#333333]'
                  }`}
                />
              </button>
            </div>

            {/* Auto-detected notice */}
            {dataSaver.autoDetected && dataSaver.enabled && (
              <div className="mb-4 p-2.5 border border-[#FFB800]/30 bg-[#FFB800]/5 flex items-center gap-2">
                <span className="text-[#FFB800] text-[9px]">⚡</span>
                <span className="text-[#FFB800] text-[8px] tracking-[0.15em]">
                  AUTO-DETECTED — Your device or network indicated data saver preference
                </span>
              </div>
            )}

            {/* Data saver options (only visible when enabled) */}
            <AnimatePresence>
              {dataSaver.enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 mb-4">
                    <DataSaverOption
                      label="COMPRESS IMAGES"
                      description="Use smallest available image sizes"
                      enabled={dataSaver.forceSmallImages}
                      onToggle={() => handleDataSaverOption('forceSmallImages', !dataSaver.forceSmallImages)}
                      savings="~60% bandwidth"
                    />
                    <DataSaverOption
                      label="DISABLE AUTOPLAY"
                      description="Don't auto-play video embeds"
                      enabled={dataSaver.disableAutoplay}
                      onToggle={() => handleDataSaverOption('disableAutoplay', !dataSaver.disableAutoplay)}
                      savings="~80% bandwidth"
                    />
                    <DataSaverOption
                      label="REDUCE ANIMATIONS"
                      description="Disable hover and scroll animations"
                      enabled={dataSaver.disableHoverAnimations}
                      onToggle={() => handleDataSaverOption('disableHoverAnimations', !dataSaver.disableHoverAnimations)}
                      savings="~5% CPU"
                    />
                    <DataSaverOption
                      label="LIMIT RESULTS"
                      description="Show fewer items per page"
                      enabled={dataSaver.limitGridItems}
                      onToggle={() => handleDataSaverOption('limitGridItems', !dataSaver.limitGridItems)}
                      savings="~40% bandwidth"
                    />
                  </div>

                  {/* Estimated savings */}
                  <div className="p-3 border border-[#1a1a1a] bg-[#080808]">
                    <div className="text-[9px] text-[#333333] tracking-[0.3em] mb-2">ESTIMATED SAVINGS</div>
                    <div className="flex items-center gap-3">
                      <div className="text-[#FFB800] text-lg tracking-wider">
                        {calculateSavings(dataSaver)}
                      </div>
                      <div className="text-[#444444] text-[8px] tracking-[0.15em]">
                        EST. DATA REDUCTION PER PAGE LOAD
                      </div>
                    </div>
                    <div className="mt-2 h-1 bg-[#1a1a1a]">
                      <div
                        className="h-full bg-[#FFB800] transition-all duration-500"
                        style={{ width: calculateSavingsPercent(dataSaver) }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCollapsible>

          {/* ═══════════════════════════════════════════ */}
          {/* SECTION 4: SOUND                           */}
          {/* ═══════════════════════════════════════════ */}
          <SectionCollapsible
            title="SOUND"
            icon="♦"
            isOpen={activeSection === 'sound'}
            onToggle={() => toggleSection('sound')}
          >
            <SoundSettings />
          </SectionCollapsible>

          {/* ═══════════════════════════════════════════ */}
          {/* SECTION 5: KEYBOARD SHORTCUTS               */}
          {/* ═══════════════════════════════════════════ */}
          <SectionCollapsible
            title="SHORTCUTS"
            icon="⌨"
            isOpen={activeSection === 'shortcuts'}
            onToggle={() => toggleSection('shortcuts')}
          >
            <div className="grid grid-cols-1 gap-1.5">
              <ShortcutRow keys={['1', '2', '3', '4']} action="Navigate sections" />
              <ShortcutRow keys={['/']} action="Focus search bar" />
              <ShortcutRow keys={['W']} action="Open watchlist" />
              <ShortcutRow keys={['Ctrl', ',']} action="Open settings" />
              <ShortcutRow keys={['Esc']} action="Close panels / modal" />
              <ShortcutRow keys={['G']} action="Scroll to top" />
              <ShortcutRow keys={['Shift', 'G']} action="Scroll to bottom" />
              <ShortcutRow keys={['←', '→']} action="Navigate catalog pages" />
            </div>
          </SectionCollapsible>

          {/* ═══════════════════════════════════════════ */}
          {/* SYSTEM                                     */}
          {/* ═══════════════════════════════════════════ */}
          <div className="p-4 border-t border-[#1a1a1a]">
            <button
              onClick={handleReset}
              className="w-full p-3 border border-[#1a1a1a] bg-[#0a0a0a] text-[#444444] text-[10px] tracking-[0.3em] hover:border-[#E4002B]/50 hover:text-[#E4002B] transition-colors"
            >
              ⟳ RE-RUN DEVICE DETECTION
            </button>
            <div className="text-[#333333] text-[8px] tracking-[0.15em] mt-2">
              Clears all preferences and restarts the boot sequence.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Sub-components ──────────────────────────────────────

function SectionCollapsible({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#1a1a1a]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-[#0a0a0a] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs">{icon}</span>
          <span className="text-[#E0E0E0] text-[10px] tracking-[0.4em]">{title}</span>
        </div>
        <span className={`text-[#444444] text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#333333] text-[10px] tracking-[0.2em]">{label}</span>
      <span
        className="text-[#B8B8B8] text-[10px] tracking-[0.15em] font-mono truncate max-w-[140px] text-right"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function TierFeature({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1 h-1 ${enabled ? 'bg-[#00E400]' : 'bg-[#1a1a1a]'}`} />
      <span className={`text-[8px] tracking-[0.1em] ${enabled ? 'text-[#666666]' : 'text-[#333333]'}`}>
        {label}
      </span>
    </div>
  );
}

function DataSaverOption({
  label,
  description,
  enabled,
  onToggle,
  savings,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  savings: string;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 border border-[#1a1a1a] bg-[#080808]">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-[#B8B8B8] tracking-[0.2em]">{label}</div>
        <div className="text-[#333333] text-[7px] tracking-[0.1em] mt-0.5">{description}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[#FFB800] text-[8px] tracking-[0.1em]">{savings}</span>
        <button
          onClick={onToggle}
          className={`w-8 h-4 border transition-all duration-200 relative ${
            enabled ? 'border-[#FFB800]/60' : 'border-[#1a1a1a]'
          }`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 transition-all duration-200 ${
              enabled ? 'left-4 bg-[#FFB800]' : 'left-0.5 bg-[#333333]'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function calculateSavings(config: DataSaverConfig): string {
  let savings = 0;
  if (config.forceSmallImages) savings += 60;
  if (config.disableAutoplay) savings += 80;
  if (config.disableHoverAnimations) savings += 5;
  if (config.limitGridItems) savings += 40;
  // Cap at reasonable display
  const avg = Math.min(Math.round(savings / 4 * 10) / 10, 95);
  return `~${avg}%`;
}

function calculateSavingsPercent(config: DataSaverConfig): string {
  let savings = 0;
  if (config.forceSmallImages) savings += 60;
  if (config.disableAutoplay) savings += 80;
  if (config.disableHoverAnimations) savings += 5;
  if (config.limitGridItems) savings += 40;
  return `${Math.min(Math.round(savings / 4), 95)}%`;
}

// ─── Sound Settings Sub-component ──────────────────────
function SoundSettings() {
  const { enabled, ambient, toggle, toggleAmbient, play } = useSoundLib();

  return (
    <div>
      {/* Main toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[#B8B8B8] text-[11px] tracking-[0.2em]">INTERFACE SOUNDS</div>
          <div className="text-[#333333] text-[8px] tracking-[0.15em] mt-0.5">
            Audio feedback for clicks, hovers, and interactions
          </div>
        </div>
        <button
          onClick={() => toggle(!enabled)}
          className={`relative w-12 h-6 border transition-all duration-200 ${
            enabled
              ? 'border-[#E4002B]/60 bg-[#E4002B]/10'
              : 'border-[#1a1a1a] bg-[#0a0a0a]'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 transition-all duration-200 ${
              enabled
                ? 'left-6.5 bg-[#E4002B]'
                : 'left-0.5 bg-[#333333]'
            }`}
          />
        </button>
      </div>

      {/* Sound test buttons */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="text-[9px] text-[#333333] tracking-[0.3em] mb-2">TEST SOUNDS</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {([
                { type: 'click' as const, label: 'CLICK' },
                { type: 'hover' as const, label: 'HOVER' },
                { type: 'success' as const, label: 'OK' },
                { type: 'error' as const, label: 'ERROR' },
                { type: 'open' as const, label: 'OPEN' },
                { type: 'close' as const, label: 'CLOSE' },
                { type: 'navigate' as const, label: 'NAV' },
                { type: 'boot' as const, label: 'BOOT' },
              ]).map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => play(type)}
                  className="p-2 border border-[#1a1a1a] bg-[#080808] text-[8px] text-[#555555] tracking-[0.2em] hover:border-[#E4002B]/30 hover:text-[#E4002B] transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Ambient toggle */}
            <div className="flex items-center justify-between p-3 border border-[#1a1a1a] bg-[#080808]">
              <div>
                <div className="text-[#B8B8B8] text-[10px] tracking-[0.2em]">AMBIENT DRONE</div>
                <div className="text-[#333333] text-[7px] tracking-[0.1em] mt-0.5">
                  Low-frequency atmospheric hum — enhances LOOPFLIX atmosphere
                </div>
              </div>
              <button
                onClick={() => toggleAmbient(!ambient)}
                className={`relative w-12 h-6 border transition-all duration-200 ${
                  ambient
                    ? 'border-[#E4002B]/60 bg-[#E4002B]/10'
                    : 'border-[#1a1a1a] bg-[#0a0a0a]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 transition-all duration-200 ${
                    ambient
                      ? 'left-6.5 bg-[#E4002B]'
                      : 'left-0.5 bg-[#333333]'
                  }`}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shortcut Row Sub-component ────────────────────────
function ShortcutRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[#555555] text-[10px] tracking-[0.15em]">{action}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] border border-[#222222] text-[#888888] text-[9px] tracking-wider font-mono">
              {key}
            </kbd>
            {i < keys.length - 1 && (
              <span className="text-[#333333] text-[8px] mx-0.5">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Import for sound hook ─────────────────────────────
import { useSound as useSoundLib } from '../hooks/useSound';
