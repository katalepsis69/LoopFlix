'use client';
export { useDeviceCapability, runFullDetection, getCachedTier, setDeviceTier, shouldShowBoot, resetDeviceTier, applyFontSettings, setFontSettings, getCachedFontSize, getCachedFontFamily, getDataSaver, setDataSaver, isDataSaverActive, getOptimizedImageSize, TIER_CONFIG, FONT_SIZE_CONFIG, FONT_FAMILY_CONFIG, } from './useDeviceCapability';
export type { DeviceTier, DeviceInfo, FontSize, FontFamily, DataSaverConfig } from './useDeviceCapability';
export { useHydration } from './useHydration';
