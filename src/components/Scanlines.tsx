'use client';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { useHydration } from '@/hooks/useHydration';

export default function Scanlines() {
  const mounted = useHydration();
  const { tier } = useDeviceCapability();

  // Never render during SSR + only on high-tier devices
  if (!mounted || tier !== 'high') return null;

  return (
    <>
      <div className="scanlines" />
      <div className="crt-vignette" />
      <div className="noise-overlay" />
    </>
  );
}
