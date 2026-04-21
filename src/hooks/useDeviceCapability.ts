'use client';
import { useState, useEffect } from 'react';

export type DeviceTier = 'ultra_low' | 'low' | 'medium' | 'high';

export interface DeviceInfo {
  tier: DeviceTier; cpuCores: number | null; memory: number | null;
  networkType: string | null; saveData: boolean; fps: number | null;
  screenWidth: number; pixelRatio: number; isMobile: boolean;
  gpuRenderer: string | null; isAutoDetected: boolean;
}

const STORAGE_KEY = 'loopflix_device_tier';
const STORAGE_INFO_KEY = 'loopflix_device_info';

export const TIER_CONFIG: Record<DeviceTier, { label: string; description: string; color: string; bars: number }> = {
  ultra_low: { label: 'ULTRA LOW', description: 'Minimal — solid colors, no animations, smallest images', color: '#666666', bars: 1 },
  low: { label: 'LOW', description: 'Reduced — no scanlines, no blur, small images', color: '#E4002B', bars: 2 },
  medium: { label: 'STANDARD', description: 'Balanced — most effects enabled, optimized images', color: '#FFB800', bars: 3 },
  high: { label: 'HIGH', description: 'Full — scanlines, blur, all animations, full-size images', color: '#00E400', bars: 4 },
};

function probeDevice(): Omit<DeviceInfo, 'tier' | 'fps' | 'isAutoDetected' | 'gpuRenderer'> {
  const nav = navigator as any;
  return { cpuCores: nav.hardwareConcurrency ?? null, memory: nav.deviceMemory ?? null, networkType: nav.connection?.effectiveType ?? null, saveData: nav.connection?.saveData ?? false, screenWidth: window.innerWidth, pixelRatio: window.devicePixelRatio || 1, isMobile: window.innerWidth < 768 };
}

function detectGPU(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) { const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info'); if (debugInfo) return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL); }
  } catch {}
  return null;
}

function calculateTier(info: Omit<DeviceInfo, 'tier' | 'fps' | 'isAutoDetected' | 'gpuRenderer'>, fps: number | null): DeviceTier {
  let score = 0;
  if (info.cpuCores !== null) { if (info.cpuCores >= 8) score += 3; else if (info.cpuCores >= 4) score += 2; else if (info.cpuCores >= 2) score += 1; }
  if (info.memory !== null) { if (info.memory >= 8) score += 3; else if (info.memory >= 4) score += 2; else if (info.memory >= 2) score += 1; }
  if (info.networkType !== null) { if (info.networkType === '4g') score += 2; else if (info.networkType === '2g' || info.networkType === 'slow-2g') score -= 2; }
  if (info.saveData) score -= 3;
  if (info.pixelRatio >= 3 && info.screenWidth >= 1440 && (info.cpuCores ?? 4) < 6) score -= 1;
  if (fps !== null) { if (fps >= 55) score += 3; else if (fps >= 45) score += 2; else if (fps < 30) score -= 2; }
  if (score >= 7) return 'high'; if (score >= 4) return 'medium'; if (score >= 1) return 'low'; return 'ultra_low';
}

function measureFPS(durationMs = 800): Promise<number | null> {
  return new Promise((resolve) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { resolve(null); return; }
    const frames: number[] = []; let startTime: number | null = null;
    function tick(timestamp: number) {
      if (startTime === null) startTime = timestamp; frames.push(timestamp);
      if (timestamp - (startTime as number) < durationMs) requestAnimationFrame(tick);
      else { if (frames.length < 3) { resolve(null); return; } const elapsed = frames[frames.length - 1] - frames[0]; resolve(Math.round((frames.length / elapsed) * 1000)); }
    }
    requestAnimationFrame(() => requestAnimationFrame(tick));
    setTimeout(() => resolve(null), durationMs + 500);
  });
}

export async function runFullDetection(): Promise<{ deviceInfo: Omit<DeviceInfo, 'tier' | 'isAutoDetected'>; detectedTier: DeviceTier }> {
  const raw = probeDevice(); const gpu = detectGPU(); const fps = await measureFPS(); const tier = calculateTier(raw, fps);
  return { deviceInfo: { ...raw, fps, gpuRenderer: gpu }, detectedTier: tier };
}

export function getCachedTier(): DeviceTier | null {
  try { const stored = localStorage.getItem(STORAGE_KEY); if (stored && ['ultra_low','low','medium','high'].includes(stored)) return stored as DeviceTier; } catch {}
  return null;
}

export function getCachedDeviceInfo(): Partial<DeviceInfo> | null {
  try { const stored = localStorage.getItem(STORAGE_INFO_KEY); if (stored) return JSON.parse(stored); } catch {}
  return null;
}

function saveTier(tier: DeviceTier, deviceInfo?: Partial<DeviceInfo>) {
  try { localStorage.setItem(STORAGE_KEY, tier); if (deviceInfo) localStorage.setItem(STORAGE_INFO_KEY, JSON.stringify(deviceInfo)); } catch {}
}

// SSR-safe defaults — no localStorage reads during server render
const SERVER_DEFAULTS: DeviceInfo = {
  tier: 'medium', cpuCores: null, memory: null, networkType: null,
  saveData: false, fps: null, screenWidth: 1024, pixelRatio: 1,
  isMobile: false, gpuRenderer: null, isAutoDetected: false,
};

export function useDeviceCapability(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(SERVER_DEFAULTS);

  // Read localStorage ONLY after mount — prevents hydration mismatch
  useEffect(() => {
    const cached = getCachedTier();
    const cachedInfo = getCachedDeviceInfo();
    setInfo({
      tier: cached ?? 'medium',
      cpuCores: cachedInfo?.cpuCores ?? null,
      memory: cachedInfo?.memory ?? null,
      networkType: cachedInfo?.networkType ?? null,
      saveData: cachedInfo?.saveData ?? false,
      fps: cachedInfo?.fps ?? null,
      screenWidth: window.innerWidth,
      pixelRatio: window.devicePixelRatio,
      isMobile: window.innerWidth < 768,
      gpuRenderer: cachedInfo?.gpuRenderer ?? null,
      isAutoDetected: cached !== null,
    });

    const handleStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY && e.newValue) setInfo((prev) => ({ ...prev, tier: e.newValue as DeviceTier, isAutoDetected: true })); };
    const handleTierChange = () => { const c = getCachedTier(); const ci = getCachedDeviceInfo(); if (c) setInfo((prev) => ({ ...prev, ...ci, tier: c, isAutoDetected: true })); };
    const handleResize = () => setInfo((prev) => ({ ...prev, screenWidth: window.innerWidth, pixelRatio: window.devicePixelRatio, isMobile: window.innerWidth < 768 }));
    window.addEventListener('storage', handleStorage);
    window.addEventListener('loopflix_tier_changed', handleTierChange);
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('storage', handleStorage); window.removeEventListener('loopflix_tier_changed', handleTierChange); window.removeEventListener('resize', handleResize); };
  }, []);
  return info;
}

export function setDeviceTier(tier: DeviceTier, deviceInfo?: Partial<DeviceInfo>) { saveTier(tier, deviceInfo); window.dispatchEvent(new CustomEvent('loopflix_tier_changed')); }
export function shouldShowBoot(): boolean { return getCachedTier() === null; }
export function resetDeviceTier() { try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_INFO_KEY); } catch {} window.dispatchEvent(new CustomEvent('loopflix_tier_changed')); }

// ─── Font Settings ─────────────────────────────────────
export type FontSize = 'compact' | 'default' | 'comfortable' | 'large';
export type FontFamily = 'share-tech-mono' | 'vt323' | 'courier-new' | 'inter';
export const FONT_SIZE_CONFIG: Record<FontSize, { label: string; size: string; description: string }> = {
  compact: { label: 'COMPACT', size: '12px', description: 'Small text, more content on screen' },
  default: { label: 'DEFAULT', size: '14px', description: 'Standard size, balanced readability' },
  comfortable: { label: 'COMFORTABLE', size: '16px', description: 'Larger text, easier to read' },
  large: { label: 'LARGE', size: '18px', description: 'Maximum readability' },
};
export const FONT_FAMILY_CONFIG: Record<FontFamily, { label: string; css: string; description: string }> = {
  'share-tech-mono': { label: 'SHARE TECH MONO', css: "'Share Tech Mono', monospace", description: 'Default — clean terminal style' },
  'vt323': { label: 'VT323', css: "'VT323', monospace", description: 'Retro — classic terminal/arcade' },
  'courier-new': { label: 'COURIER NEW', css: "'Courier New', monospace", description: 'Classic — traditional typewriter' },
  'inter': { label: 'INTER', css: "'Inter', sans-serif", description: 'Modern — clean sans-serif, best readability' },
};
const FONT_SIZE_KEY = 'loopflix_font_size'; const FONT_FAMILY_KEY = 'loopflix_font_family'; const DATA_SAVER_KEY = 'loopflix_data_saver';

export function getCachedFontSize(): FontSize { try { const s = localStorage.getItem(FONT_SIZE_KEY); if (s && ['compact','default','comfortable','large'].includes(s)) return s as FontSize; } catch {} return 'default'; }
export function getCachedFontFamily(): FontFamily { try { const s = localStorage.getItem(FONT_FAMILY_KEY); if (s && ['share-tech-mono','vt323','courier-new','inter'].includes(s)) return s as FontFamily; } catch {} return 'share-tech-mono'; }
export function setFontSettings(fontSize: FontSize, fontFamily: FontFamily) { try { localStorage.setItem(FONT_SIZE_KEY, fontSize); localStorage.setItem(FONT_FAMILY_KEY, fontFamily); } catch {} applyFontSettings(fontSize, fontFamily); window.dispatchEvent(new CustomEvent('loopflix_fonts_changed')); }
export function applyFontSettings(fontSize?: FontSize, fontFamily?: FontFamily) { const fs = fontSize ?? getCachedFontSize(); const ff = fontFamily ?? getCachedFontFamily(); document.documentElement.style.setProperty('--font-size-base', FONT_SIZE_CONFIG[fs].size); document.documentElement.style.setProperty('--font-family', FONT_FAMILY_CONFIG[ff].css); }

export interface DataSaverConfig { enabled: boolean; autoDetected: boolean; forceSmallImages: boolean; disableAutoplay: boolean; disableHoverAnimations: boolean; limitGridItems: boolean; }
const DEFAULT_DATA_SAVER: DataSaverConfig = { enabled: false, autoDetected: false, forceSmallImages: true, disableAutoplay: true, disableHoverAnimations: true, limitGridItems: true };

export function getDataSaver(): DataSaverConfig {
  try { const s = localStorage.getItem(DATA_SAVER_KEY); if (s) return { ...DEFAULT_DATA_SAVER, ...JSON.parse(s) }; } catch {}
  const nav = navigator as any;
  if (nav.connection?.saveData || ['2g','slow-2g'].includes(nav.connection?.effectiveType ?? '')) return { ...DEFAULT_DATA_SAVER, enabled: true, autoDetected: true };
  return { ...DEFAULT_DATA_SAVER, autoDetected: false };
}
export function setDataSaver(config: Partial<DataSaverConfig>) { try { const current = getDataSaver(); localStorage.setItem(DATA_SAVER_KEY, JSON.stringify({ ...current, ...config, autoDetected: false })); } catch {} window.dispatchEvent(new CustomEvent('loopflix_datasaver_changed')); }
export function isDataSaverActive(): boolean { return getDataSaver().enabled; }
export function getOptimizedImageSize(tierSize: string, dataSaverSize: string): string { return isDataSaverActive() ? dataSaverSize : tierSize; }
