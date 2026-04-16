import { useState, useRef, useCallback } from "react";
import type { SearchResult, Timestamp } from "../lib/api";

export function usePlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  const selectResult = useCallback((result: SearchResult) => {
    setCurrentResult(result);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
  }, []);

  const seekTo = useCallback((timestamp: Timestamp) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = timestamp.timestamp_sec;
      video.play();
      setPlaying(true);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime + seconds);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) setCurrentTime(video.currentTime);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      if (currentResult && currentResult.timestamps.length > 0) {
        video.currentTime = currentResult.timestamps[0].timestamp_sec;
        video.play();
        setPlaying(true);
      }
    }
  }, [currentResult]);

  const onEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  const seekToPosition = useCallback((fraction: number) => {
    const video = videoRef.current;
    if (video && duration > 0) {
      video.currentTime = fraction * duration;
    }
  }, [duration]);

  return {
    videoRef,
    currentResult,
    currentTime,
    duration,
    playing,
    selectResult,
    seekTo,
    togglePlay,
    skip,
    seekToPosition,
    onTimeUpdate,
    onLoadedMetadata,
    onEnded,
  };
}
