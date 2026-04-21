'use client';
/**
 * useSound — LoopFlix audio system
 * Generates all sounds via Web Audio API (no audio files needed)
 * Togglable via localStorage + settings
 */
import { useState, useEffect, useCallback } from 'react';

export type SoundType = 'click' | 'hover' | 'success' | 'error' | 'open' | 'close' | 'navigate' | 'type' | 'boot' | 'ambient';

const SOUND_ENABLED_KEY = 'loopflix_sound_enabled';
const AMBIENT_ENABLED_KEY = 'loopflix_ambient_enabled';

let audioCtx: AudioContext | null = null;
let ambientNode: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode } | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}

function createNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

const soundGenerators: Record<SoundType, (ctx: AudioContext) => void> = {
  click(ctx) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05);
  },
  hover(ctx) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.04);
  },
  success(ctx) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
  },
  error(ctx) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
    const noise = createNoise(ctx, 0.15); const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    noise.connect(noiseGain); noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime); noise.stop(ctx.currentTime + 0.15);
  },
  open(ctx) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
  },
  close(ctx) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
  },
  navigate(ctx) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.setValueAtTime(700, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06);
  },
  type(ctx) {
    const noise = createNoise(ctx, 0.03); const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.Q.setValueAtTime(2, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(ctx.currentTime); noise.stop(ctx.currentTime + 0.03);
  },
  boot(ctx) {
    [400, 500, 600, 800].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + i * 0.12 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.1);
    });
  },
  ambient() { return; },
};

export function startAmbient() {
  const ctx = getAudioContext(); if (!ctx || ambientNode) return;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(55, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 3);
  lfo.type = 'sine'; lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
  lfoGain.gain.setValueAtTime(5, ctx.currentTime);
  osc.connect(lfoGain); lfoGain.connect(osc.frequency);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(ctx.currentTime); lfo.start(ctx.currentTime);
  ambientNode = { osc, gain, lfo, lfoGain };
}

export function stopAmbient() {
  if (!ambientNode) return;
  const ctx = getAudioContext(); if (!ctx) return;
  ambientNode.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
  setTimeout(() => { try { ambientNode?.osc.stop(); ambientNode?.lfo.stop(); } catch {} ambientNode = null; }, 2500);
}

export function isSoundEnabled(): boolean { return typeof window !== 'undefined' && localStorage.getItem(SOUND_ENABLED_KEY) === 'true'; }
export function setSoundEnabled(enabled: boolean) { localStorage.setItem(SOUND_ENABLED_KEY, String(enabled)); window.dispatchEvent(new Event('loopflix_sound_changed')); if (!enabled) stopAmbient(); }
export function isAmbientEnabled(): boolean { return typeof window !== 'undefined' && localStorage.getItem(AMBIENT_ENABLED_KEY) === 'true'; }
export function setAmbientEnabled(enabled: boolean) { localStorage.setItem(AMBIENT_ENABLED_KEY, String(enabled)); window.dispatchEvent(new Event('loopflix_sound_changed')); if (enabled && isSoundEnabled()) startAmbient(); else stopAmbient(); }
export function playSound(type: SoundType) { if (!isSoundEnabled() || type === 'ambient') return; const ctx = getAudioContext(); if (!ctx) return; try { soundGenerators[type](ctx); } catch {} }

export interface SoundState { enabled: boolean; ambient: boolean; }

export function useSound() {
  const [state, setState] = useState<SoundState>({ enabled: false, ambient: false });
  useEffect(() => {
    setState({ enabled: isSoundEnabled(), ambient: isAmbientEnabled() });
    const handler = () => setState({ enabled: isSoundEnabled(), ambient: isAmbientEnabled() });
    window.addEventListener('loopflix_sound_changed', handler);
    return () => window.removeEventListener('loopflix_sound_changed', handler);
  }, []);
  return { ...state, toggle: useCallback((e: boolean) => setSoundEnabled(e), []), toggleAmbient: useCallback((e: boolean) => setAmbientEnabled(e), []), play: useCallback((t: SoundType) => playSound(t), []) };
}
