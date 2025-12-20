'use client';

import { useState, useEffect, useRef } from 'react';

interface AudioPlayerProps {
  src: string;
  isOwn: boolean;
}

export function AudioPlayer({ src, isOwn }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isDurationKnown = Number.isFinite(duration) && duration > 0;
  const safeFormatTime = (time: number) => {
    return Number.isFinite(time) && time >= 0
      ? formatTime(time)
      : '--:--';
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      // Algunos navegadores reportan Infinity si no está listo
      const dur = audio.duration;
      setDuration(Number.isFinite(dur) ? dur : 0);
      setError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('Error cargando audio:', src, e);
      setError(true);
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      setError(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Forzar recarga si la fuente cambió
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Reintentar cargar si es necesario
        if (audio.readyState < 2) {
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error reproduciendo audio:', err);
      setIsPlaying(false);
      setError(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 min-w-60 max-w-70 p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
        <span className="text-xs text-red-600 dark:text-red-400">❌ Error cargando audio</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-60 max-w-70">
      <audio 
        ref={audioRef} 
        src={src} 
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      <button
        onClick={togglePlay}
        disabled={error}
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isOwn 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" />
            <rect x="9" y="2" width="4" height="12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2 L4 14 L13 8 Z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <input
          type="range"
          min="0"
          max={isDurationKnown ? duration : 1}
          value={currentTime}
          onChange={handleSeek}
          disabled={error || !isDurationKnown}
          className={`w-full h-1 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed ${
            isOwn 
              ? 'audio-slider-own' 
              : 'audio-slider'
          }`}
          style={{
            background: isOwn 
              ? `linear-gradient(to right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) ${isDurationKnown ? Math.min(100, (currentTime / duration) * 100) : 0}%, rgba(255,255,255,0.2) ${isDurationKnown ? Math.min(100, (currentTime / duration) * 100) : 0}%, rgba(255,255,255,0.2) 100%)`
              : `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${isDurationKnown ? Math.min(100, (currentTime / duration) * 100) : 0}%, #d1d5db ${isDurationKnown ? Math.min(100, (currentTime / duration) * 100) : 0}%, #d1d5db 100%)`
          }}
        />
        <div className="flex justify-between text-xs opacity-70">
          <span>{safeFormatTime(currentTime)}</span>
          <span>{safeFormatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
