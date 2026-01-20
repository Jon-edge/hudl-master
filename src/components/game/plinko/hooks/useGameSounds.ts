"use client"

import { useRef, useCallback, useEffect, useState } from "react"

interface SoundPool {
  audios: HTMLAudioElement[]
  index: number
}

export interface UseGameSoundsOptions {
  enabled?: boolean
  volume?: number
}

export interface UseGameSoundsReturn {
  playCollision: (velocity?: number) => void
  playBucket: () => void
  playWin: () => void
  isMuted: boolean
  setMuted: (muted: boolean) => void
  volume: number
  setVolume: (volume: number) => void
}

// Sound URLs - using Web Audio API with synthesized sounds for reliability
const COLLISION_FREQUENCIES = [800, 900, 1000, 1100, 1200]
const BUCKET_FREQUENCY = 600
const WIN_FREQUENCIES = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

/**
 * Hook for managing game sound effects using Web Audio API
 */
export function useGameSounds({
  enabled = true,
  volume: initialVolume = 0.5,
}: UseGameSoundsOptions = {}): UseGameSoundsReturn {
  const [isMuted, setMuted] = useState(!enabled)
  const [volume, setVolume] = useState(initialVolume)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  // Initialize Audio Context
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current
    
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioContextRef.current = ctx
      
      const gainNode = ctx.createGain()
      gainNode.connect(ctx.destination)
      gainNode.gain.value = volume
      gainNodeRef.current = gainNode
      
      return ctx
    } catch {
      console.warn("Web Audio API not supported")
      return null
    }
  }, [volume])

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Play a synthesized tone
  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    attack = 0.01,
    release = 0.1
  ) => {
    if (isMuted) return
    
    const ctx = initAudioContext()
    if (!ctx || !gainNodeRef.current) return

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    const envelope = ctx.createGain()
    
    oscillator.type = type
    oscillator.frequency.value = frequency
    
    envelope.gain.setValueAtTime(0, ctx.currentTime)
    envelope.gain.linearRampToValueAtTime(0.3, ctx.currentTime + attack)
    envelope.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration - release)
    envelope.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
    
    oscillator.connect(envelope)
    envelope.connect(gainNodeRef.current)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }, [isMuted, initAudioContext])

  // Collision sound - varies by velocity
  const playCollision = useCallback((velocity = 5) => {
    if (isMuted) return
    
    // Higher velocity = higher pitch and shorter duration
    const normalizedVelocity = Math.min(Math.max(velocity / 15, 0), 1)
    const freqIndex = Math.floor(normalizedVelocity * (COLLISION_FREQUENCIES.length - 1))
    const frequency = COLLISION_FREQUENCIES[freqIndex]
    const duration = 0.05 + (1 - normalizedVelocity) * 0.05
    
    playTone(frequency, duration, "triangle", 0.005, 0.03)
  }, [isMuted, playTone])

  // Bucket landing sound
  const playBucket = useCallback(() => {
    if (isMuted) return
    playTone(BUCKET_FREQUENCY, 0.15, "sine", 0.01, 0.1)
    setTimeout(() => playTone(BUCKET_FREQUENCY * 1.5, 0.1, "sine", 0.01, 0.05), 50)
  }, [isMuted, playTone])

  // Win celebration sound - ascending arpeggio
  const playWin = useCallback(() => {
    if (isMuted) return
    
    WIN_FREQUENCIES.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.3, "sine", 0.02, 0.15)
      }, i * 100)
    })
  }, [isMuted, playTone])

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    playCollision,
    playBucket,
    playWin,
    isMuted,
    setMuted,
    volume,
    setVolume,
  }
}
