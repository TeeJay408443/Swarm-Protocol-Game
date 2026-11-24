/**
 * Hidden YouTube Boss Music Player
 * Streams YouTube-backed boss themes off-screen with no visible video, while reporting
 * live playback timestamps to AudioContext so the spawn cutscene ends right on the beat drop.
 */

import React, { useEffect, useMemo, useRef } from 'react'
import { useAudio } from '../../context/AudioContext'
import {
  buildYouTubeEmbedUrl,
  MUSIC_TRACK_METADATA
} from '../../services/AudioService'

interface YTPlayerInstance {
  playVideo?: () => void
  pauseVideo?: () => void
  stopVideo?: () => void
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void
  getCurrentTime?: () => number
  getPlayerState?: () => number
  setVolume?: (volume: number) => void
  mute?: () => void
  unMute?: () => void
  destroy?: () => void
}

interface YTGlobal {
  Player: new (
    element: HTMLElement | string,
    options: {
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void
        onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void
        onError?: () => void
      }
    }
  ) => YTPlayerInstance
}

declare global {
  interface Window {
    YT?: YTGlobal
    onYouTubeIframeAPIReady?: () => void
  }
}

let ytApiLoadPromise: Promise<YTGlobal | null> | null = null

function loadYouTubeIframeApi(): Promise<YTGlobal | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null)
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT)
  }
  if (ytApiLoadPromise) {
    return ytApiLoadPromise
  }

  ytApiLoadPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady
    const timeoutId = setTimeout(() => {
      resolve(window.YT && typeof window.YT.Player === 'function' ? window.YT : null)
    }, 6000)

    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeoutId)
      if (typeof prevReady === 'function') {
        try {
          prevReady()
        } catch {
          // Ignore prior callback error
        }
      }
      resolve(window.YT && typeof window.YT.Player === 'function' ? window.YT : null)
    }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.onerror = () => {
        clearTimeout(timeoutId)
        resolve(null)
      }
      document.head.appendChild(tag)
    }
  })

  return ytApiLoadPromise
}

function sendYouTubeCommand(
  iframe: HTMLIFrameElement | null,
  func: string,
  args: unknown[] = []
): void {
  try {
    iframe?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      'https://www.youtube.com'
    )
  } catch {
    // Ignore cross-origin postMessage failures
  }
}

export const YouTubeBossMusicPlayer: React.FC = () => {
  const {
    audioService,
    settings,
    currentMusicTrack,
    isMusicPaused,
    setExternalYouTubeActive,
    reportYouTubePlayback
  } = useAudio()

  const trackMeta = currentMusicTrack ? MUSIC_TRACK_METADATA[currentMusicTrack] : null
  const videoId = trackMeta?.youtubeVideoId || null

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null)
  const isPausedRef = useRef<boolean>(isMusicPaused)
  isPausedRef.current = isMusicPaused

  const embedUrl = useMemo(() => {
    if (!videoId) return ''
    const origin =
      typeof window !== 'undefined' && window.location?.origin?.startsWith('http')
        ? window.location.origin
        : undefined
    return buildYouTubeEmbedUrl(videoId, {
      autoplay: true,
      loop: true,
      enableJsApi: true,
      origin
    })
  }, [videoId])

  const effectiveVolume = useMemo(() => {
    if (settings.isMuted) return 0
    return Math.max(
      0,
      Math.min(100, Math.round((settings.musicVolume / 100) * (settings.masterVolume / 100) * 100))
    )
  }, [settings.isMuted, settings.masterVolume, settings.musicVolume])

  const effectiveVolumeRef = useRef(effectiveVolume)
  effectiveVolumeRef.current = effectiveVolume
  const isMutedRef = useRef(settings.isMuted)
  isMutedRef.current = settings.isMuted

  // Initialize the hidden player for the active YouTube-backed boss theme.
  useEffect(() => {
    if (!videoId) {
      setExternalYouTubeActive(false)
      reportYouTubePlayback(false, null)
      if (ytPlayerRef.current?.destroy) {
        try {
          ytPlayerRef.current.destroy()
        } catch {
          // Ignore destroy failure
        }
      }
      ytPlayerRef.current = null
      return
    }

    let cancelled = false
    let syncInterval: ReturnType<typeof setInterval> | null = null
    setExternalYouTubeActive(true)
    reportYouTubePlayback(false, null)

    const applyVolumeAndPlay = (target: YTPlayerInstance | null) => {
      if (!target || cancelled) return
      if (isMutedRef.current || effectiveVolumeRef.current <= 0) {
        target.mute?.()
      } else {
        target.unMute?.()
        target.setVolume?.(effectiveVolumeRef.current)
      }
      if (!isPausedRef.current) {
        target.playVideo?.()
      }
    }

    // Silent interaction fallback: if browser blocks unmuted autoplay initially, unlock on next input without UI
    const handleUnlockGesture = () => {
      if (cancelled) return
      const target = ytPlayerRef.current
      applyVolumeAndPlay(target)
      if (!isPausedRef.current) {
        sendYouTubeCommand(iframeRef.current, 'playVideo')
      }
    }
    window.addEventListener('pointerdown', handleUnlockGesture, { passive: true })
    window.addEventListener('keydown', handleUnlockGesture, { passive: true })

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !YT || !iframeRef.current) return
      try {
        const player = new YT.Player(iframeRef.current, {
          events: {
            onReady: (ev) => {
              if (cancelled) return
              const target = ev.target
              target.seekTo?.(0, true)
              applyVolumeAndPlay(target)
              sendYouTubeCommand(iframeRef.current, 'playVideo')
            },
            onStateChange: (ev) => {
              if (cancelled) return
              // 1 = PLAYING, 0 = ENDED, 2 = PAUSED
              if (ev.data === 1) {
                const t = ev.target.getCurrentTime?.()
                reportYouTubePlayback(
                  true,
                  typeof t === 'number' && Number.isFinite(t) ? t : 0
                )
              } else if (ev.data === 0) {
                ev.target.seekTo?.(0, true)
                ev.target.playVideo?.()
              }
            }
          }
        })
        ytPlayerRef.current = player

        syncInterval = setInterval(() => {
          if (cancelled || !ytPlayerRef.current) return
          const state = ytPlayerRef.current.getPlayerState?.()
          if (state === 1) {
            const t = ytPlayerRef.current.getCurrentTime?.()
            if (typeof t === 'number' && Number.isFinite(t)) {
              reportYouTubePlayback(true, t)
            }
          }
        }, 35)
      } catch {
        // Ignore player init error
      }
    })

    return () => {
      cancelled = true
      if (syncInterval !== null) {
        clearInterval(syncInterval)
      }
      window.removeEventListener('pointerdown', handleUnlockGesture)
      window.removeEventListener('keydown', handleUnlockGesture)
      setExternalYouTubeActive(false)
      reportYouTubePlayback(false, null)
      if (ytPlayerRef.current?.stopVideo) {
        try {
          ytPlayerRef.current.stopVideo()
        } catch {
          // Ignore
        }
      }
      if (ytPlayerRef.current?.destroy) {
        try {
          ytPlayerRef.current.destroy()
        } catch {
          // Ignore
        }
      }
      ytPlayerRef.current = null
    }
  }, [videoId, setExternalYouTubeActive, reportYouTubePlayback])

  // Live volume & mute synchronization with AudioSettings
  useEffect(() => {
    if (!videoId) return
    const targetVol = audioService ? audioService.getEffectiveMusicVolumePercent() : effectiveVolume
    const player = ytPlayerRef.current
    if (settings.isMuted || targetVol <= 0) {
      player?.mute?.()
      sendYouTubeCommand(iframeRef.current, 'mute')
    } else {
      player?.unMute?.()
      player?.setVolume?.(targetVol)
      sendYouTubeCommand(iframeRef.current, 'unMute')
      sendYouTubeCommand(iframeRef.current, 'setVolume', [targetVol])
    }
  }, [videoId, audioService, effectiveVolume, settings.isMuted])

  // Sync PauseMenu & run pause/resume
  useEffect(() => {
    if (!videoId) return
    const player = ytPlayerRef.current
    if (isMusicPaused) {
      player?.pauseVideo?.()
      sendYouTubeCommand(iframeRef.current, 'pauseVideo')
    } else {
      player?.playVideo?.()
      sendYouTubeCommand(iframeRef.current, 'playVideo')
    }
  }, [videoId, isMusicPaused])

  if (!videoId || !trackMeta) {
    return null
  }

  // Strictly hidden offscreen container so no YouTube popup or video frame ever appears
  return (
    <div
      aria-hidden="true"
      className="fixed -left-[9999px] -top-[9999px] h-[2px] w-[2px] overflow-hidden opacity-0 pointer-events-none"
    >
      <iframe
        ref={iframeRef}
        id="boss-youtube-music-iframe"
        title={`${trackMeta.title} Boss Music`}
        src={embedUrl}
        width={2}
        height={2}
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        className="border-0"
      />
    </div>
  )
}

export default YouTubeBossMusicPlayer
