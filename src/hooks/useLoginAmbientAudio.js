import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_SRC = '/audio/login-ambient.mp3';
const VOLUME = 0.22;

/**
 * Optional login ambient audio — respects autoplay policies.
 * Tries MP3 when ready; replays on first user gesture if blocked.
 * Falls back to a soft Web Audio pad if the file is missing.
 */
export function useLoginAmbientAudio(src = DEFAULT_SRC) {
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const playedRef = useRef(false);
  const [status, setStatus] = useState('idle');

  const stopFallback = useCallback(() => {
    if (ctxRef.current) {
      try {
        ctxRef.current.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
    }
  }, []);

  const playWebAudioFallback = useCallback(async () => {
    if (playedRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        setStatus('unavailable');
        return;
      }
      const ctx = new Ctx();
      ctxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = 196;
      osc2.frequency.value = 294;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(VOLUME * 0.35, ctx.currentTime + 1.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 8);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 8);
      osc2.stop(ctx.currentTime + 8);

      playedRef.current = true;
      setStatus('playing');
      osc2.onended = () => stopFallback();
    } catch {
      setStatus('unavailable');
    }
  }, [stopFallback]);

  const tryPlay = useCallback(async () => {
    if (playedRef.current) return;

    const audio = audioRef.current;
    if (audio?.dataset.ready === 'true') {
      try {
        audio.volume = VOLUME;
        await audio.play();
        playedRef.current = true;
        setStatus('playing');
        return;
      } catch {
        setStatus('blocked');
      }
    }

    if (audio?.dataset.ready === 'false') {
      await playWebAudioFallback();
    }
  }, [playWebAudioFallback]);

  useEffect(() => {
    let cancelled = false;
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = VOLUME;

    const onReady = () => {
      if (cancelled) return;
      audio.dataset.ready = 'true';
      void tryPlay();
    };
    const onFail = () => {
      if (cancelled) return;
      audio.dataset.ready = 'false';
      void playWebAudioFallback();
    };

    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('error', onFail);
    audioRef.current = audio;

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onFail);
      audio.src = '';
      audioRef.current = null;
      stopFallback();
    };
  }, [src, tryPlay, playWebAudioFallback, stopFallback]);

  const bindGesture = useCallback(() => {
    if (!playedRef.current) void tryPlay();
  }, [tryPlay]);

  return { status, bindGesture, tryPlay };
}
