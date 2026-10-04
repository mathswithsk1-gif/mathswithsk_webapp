"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, AlertTriangle } from "lucide-react";
import { extractYouTubeId } from "src/lib/youtube";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

interface VideoPlayerProps {
  videoId: string; // YouTube Video ID or full YouTube URL
  signedUrl?: string;
  duration: number; // in seconds
  maxPositionSeconds?: number; // furthest point student has watched
  isVSL?: boolean;
  onProgress?: (seconds: number) => void;
  onComplete?: () => void;
}

export function VideoPlayer({
  videoId,
  duration,
  maxPositionSeconds = 0,
  isVSL = false,
  onProgress,
  onComplete,
}: VideoPlayerProps) {
  const cleanYouTubeId = extractYouTubeId(videoId) || "dQw4w9WgXcQ";

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  
  // Track furthest point watched locally to enforce anti-scrubbing
  const furthestWatched = useRef(maxPositionSeconds);
  const lastReportedTime = useRef(0);

  // Sync prop changes to local ref
  useEffect(() => {
    furthestWatched.current = Math.max(furthestWatched.current, maxPositionSeconds);
  }, [maxPositionSeconds]);

  // Toast auto-hide
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Load YouTube IFrame API Script dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.YT && window.YT.Player) {
      setYtReady(true);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) previousReady();
      setYtReady(true);
    };
  }, []);

  // Instantiate YouTube Player
  useEffect(() => {
    if (!ytReady || !containerRef.current) return;

    // Clear element content before creating player instance
    containerRef.current.innerHTML = "";

    const playerElement = document.createElement("div");
    playerElement.id = `yt-player-${Math.random().toString(36).substr(2, 9)}`;
    containerRef.current.appendChild(playerElement);

    const player = new window.YT.Player(playerElement.id, {
      width: "100%",
      height: "100%",
      videoId: cleanYouTubeId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onStateChange: (event: any) => {
          // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
          if (event.data === 1) {
            setIsPlaying(true);
          } else if (event.data === 2) {
            setIsPlaying(false);
            if (onProgress && !isVSL && playerRef.current?.getCurrentTime) {
              onProgress(playerRef.current.getCurrentTime());
            }
          } else if (event.data === 0) {
            setIsPlaying(false);
            if (onComplete) onComplete();
          }
        },
      },
    });

    playerRef.current = player;

    return () => {
      if (player && typeof player.destroy === "function") {
        try {
          player.destroy();
        } catch (e) {}
      }
    };
  }, [ytReady, cleanYouTubeId]);

  // Active Playback Monitor Ticker for Anti-Scrubbing & Progress
  useEffect(() => {
    if (!ytReady) return;

    const interval = setInterval(() => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== "function") return;

      try {
        const time = playerRef.current.getCurrentTime() || 0;
        setCurrentTime(time);

        if (!isVSL) {
          // Anti-Forward Scrubbing Lock:
          // If user seeks forward beyond furthest watched point + 3s buffer
          if (time > furthestWatched.current + 3) {
            setShowToast(true);
            playerRef.current.seekTo(furthestWatched.current, true);
          } else {
            // Update furthest watched point
            furthestWatched.current = Math.max(furthestWatched.current, time);

            // Report progress every 10 seconds or when nearing completion (90%)
            if (onProgress && Math.abs(time - lastReportedTime.current) >= 10) {
              lastReportedTime.current = time;
              onProgress(time);
            }

            // Check if 90% reached
            const totalDur = playerRef.current.getDuration() || duration || 600;
            if (totalDur > 0 && time / totalDur >= 0.90 && onComplete) {
              onComplete();
            }
          }
        }
      } catch (err) {}
    }, 500);

    return () => clearInterval(interval);
  }, [ytReady, isVSL, duration, onProgress, onComplete]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/10 shadow-2xl group">
      {/* Toast Alert overlay for seeking block */}
      {showToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-500/90 text-white text-xs md:text-sm font-extrabold px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 animate-bounce flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
          <span>⚠️ Complete earlier parts to unlock seeking forward</span>
        </div>
      )}

      {/* YouTube IFrame Player Container */}
      <div ref={containerRef} className="w-full h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&_iframe]:rounded-2xl" />
    </div>
  );
}

export default VideoPlayer;
