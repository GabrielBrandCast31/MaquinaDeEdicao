import {useEffect, useState} from 'react';

// One shared player for every SFX preview in the Lab: starting a sound stops the previous one.
const audio = typeof Audio === 'undefined' ? null : new Audio();
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
audio?.addEventListener('ended', () => { current = null; emit(); });
audio?.addEventListener('pause', () => { current = null; emit(); });

export const sfxUrl = (name: string) => `/static/sfx/${name}.wav`;

/** Plays a sound from public/sfx (toggles off if it is already playing). */
export const playSfx = (name: string, volume = 0.8) => {
  if (!audio) return;
  if (current === name && !audio.paused) { audio.pause(); return; }
  audio.pause();
  audio.src = sfxUrl(name);
  audio.volume = volume;
  audio.currentTime = 0;
  current = name;
  emit();
  audio.play().catch(() => { current = null; emit(); });
};

/** Name of the sound playing now, and its progress 0..1 (updated every frame while playing). */
export const useSfxPlaying = () => {
  const [state, setState] = useState<{name: string | null; t: number}>({name: current, t: 0});
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setState({name: current, t: audio && audio.duration ? audio.currentTime / audio.duration : 0});
      if (current) raf = requestAnimationFrame(tick);
    };
    const on = () => { cancelAnimationFrame(raf); tick(); };
    listeners.add(on);
    return () => { listeners.delete(on); cancelAnimationFrame(raf); };
  }, []);
  return state;
};
