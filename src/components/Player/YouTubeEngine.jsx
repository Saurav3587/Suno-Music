import React, { useEffect, useRef } from 'react';

/**
 * YouTube IFrame Player engine that renders invisibly or embedded
 * Controls are driven seamlessly through MusicContext
 */
export default function YouTubeEngine({
  currentTrack,
  isPlaying,
  volume,
  onTimeUpdate,
  onDurationChange,
  onStateChange,
  onEnded,
  ytPlayerRef,
  containerId = 'suno-yt-player'
}) {
  const playerInstance = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Load YouTube IFrame API if not already present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerInstance.current) return;

      playerInstance.current = new window.YT.Player(containerId, {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
          enablejsapi: 1
        },
        events: {
          onReady: (e) => {
            ytPlayerRef.current = e.target;
            if (currentTrack?.youtubeId) {
              if (isPlaying) {
                e.target.loadVideoById(currentTrack.youtubeId);
              } else {
                e.target.cueVideoById(currentTrack.youtubeId);
              }
            }
          },
          onStateChange: (e) => {
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
            if (e.data === window.YT.PlayerState.PLAYING) {
              onStateChange(true);
              if (onDurationChange) {
                const dur = e.target.getDuration();
                if (dur) onDurationChange(dur);
              }
            } else if (e.data === window.YT.PlayerState.PAUSED) {
              onStateChange(false);
            } else if (e.data === window.YT.PlayerState.ENDED) {
              onStateChange(false);
              if (onEnded) onEnded();
            }
          },
          onError: (e) => {
            console.warn('YouTube embed error code:', e.data, '(restricted video). Auto-skipping to next track...');
            onStateChange(false);
            if (onEnded) {
              setTimeout(() => onEnded(), 250);
            }
          }
        }
      });
      ytPlayerRef.current = playerInstance.current;
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Time update poller
    intervalRef.current = setInterval(() => {
      if (playerInstance.current && typeof playerInstance.current.getCurrentTime === 'function') {
        try {
          const state = playerInstance.current.getPlayerState();
          if (state === 1) { // PLAYING
            const cur = playerInstance.current.getCurrentTime();
            const dur = playerInstance.current.getDuration();
            if (cur !== undefined && onTimeUpdate) onTimeUpdate(cur);
            if (dur !== undefined && onDurationChange) onDurationChange(dur);
          }
        } catch {
          // Ignore before player ready
        }
      }
    }, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(volume * 100);
      } catch {}
    }
  }, [volume]);

  return (
    <div
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none'
      }}
    >
      <div id={containerId} style={{ width: '1px', height: '1px' }} />
    </div>
  );
}
