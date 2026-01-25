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
  playWin: (winnerName?: string) => void
  playTiebreaker: () => void
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

  // Win celebration sound - plays personalized sound or ascending arpeggio fallback
  const playWin = useCallback((winnerName?: string) => {
    if (isMuted) return
    
    // Try to play personalized winner sound if name provided
    if (winnerName) {
      const audio = new Audio(`https://nyc3.digitaloceanspaces.com/edgecontent/UI4/hudl/${winnerName.toLowerCase()}.wav`)
      audio.volume = volume
      audio.play().catch(() => {
        // Fallback to arpeggio if personalized sound fails
        WIN_FREQUENCIES.forEach((freq, i) => {
          setTimeout(() => {
            playTone(freq, 0.3, "sine", 0.02, 0.15)
          }, i * 100)
        })
      })
      return
    }
    
    // Default arpeggio
    WIN_FREQUENCIES.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.3, "sine", 0.02, 0.15)
      }, i * 100)
    })
  }, [isMuted, playTone, volume])

  // Tiebreaker announcement sound - dramatic electronic stinger with tension
  const playTiebreaker = useCallback(() => {
    if (isMuted) return
    
    const ctx = initAudioContext()
    if (!ctx || !gainNodeRef.current) return

    if (ctx.state === "suspended") {
      ctx.resume()
    }

    // Create a dramatic "BWAAAAH" impact sound with multiple layers
    
    // Layer 1: Low sub-bass impact
    const subOsc = ctx.createOscillator()
    const subEnv = ctx.createGain()
    subOsc.type = "sine"
    subOsc.frequency.setValueAtTime(80, ctx.currentTime)
    subOsc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3)
    subEnv.gain.setValueAtTime(0, ctx.currentTime)
    subEnv.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02)
    subEnv.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    subOsc.connect(subEnv)
    subEnv.connect(gainNodeRef.current)
    subOsc.start(ctx.currentTime)
    subOsc.stop(ctx.currentTime + 0.5)

    // Layer 2: Mid-range aggressive saw wave
    const midOsc = ctx.createOscillator()
    const midEnv = ctx.createGain()
    midOsc.type = "sawtooth"
    midOsc.frequency.setValueAtTime(220, ctx.currentTime)
    midOsc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15)
    midEnv.gain.setValueAtTime(0, ctx.currentTime)
    midEnv.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01)
    midEnv.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    midOsc.connect(midEnv)
    midEnv.connect(gainNodeRef.current)
    midOsc.start(ctx.currentTime)
    midOsc.stop(ctx.currentTime + 0.3)

    // Layer 3: High-pitched glitchy texture
    const glitchOsc = ctx.createOscillator()
    const glitchEnv = ctx.createGain()
    glitchOsc.type = "square"
    glitchOsc.frequency.setValueAtTime(880, ctx.currentTime)
    glitchOsc.frequency.setValueAtTime(1320, ctx.currentTime + 0.03)
    glitchOsc.frequency.setValueAtTime(660, ctx.currentTime + 0.06)
    glitchOsc.frequency.setValueAtTime(990, ctx.currentTime + 0.09)
    glitchEnv.gain.setValueAtTime(0, ctx.currentTime)
    glitchEnv.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.005)
    glitchEnv.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
    glitchOsc.connect(glitchEnv)
    glitchEnv.connect(gainNodeRef.current)
    glitchOsc.start(ctx.currentTime)
    glitchOsc.stop(ctx.currentTime + 0.15)

    // Layer 4: Noise burst for impact texture
    const bufferSize = ctx.sampleRate * 0.1
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1
    }
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = "bandpass"
    noiseFilter.frequency.value = 2000
    noiseFilter.Q.value = 1
    const noiseEnv = ctx.createGain()
    noiseEnv.gain.setValueAtTime(0, ctx.currentTime)
    noiseEnv.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.005)
    noiseEnv.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseEnv)
    noiseEnv.connect(gainNodeRef.current)
    noiseSource.start(ctx.currentTime)

    // Layer 5: Delayed "whoosh" risers for drama
    setTimeout(() => {
      if (!audioContextRef.current || !gainNodeRef.current) return
      const riserCtx = audioContextRef.current
      
      const riserOsc = riserCtx.createOscillator()
      const riserEnv = riserCtx.createGain()
      riserOsc.type = "sine"
      riserOsc.frequency.setValueAtTime(200, riserCtx.currentTime)
      riserOsc.frequency.exponentialRampToValueAtTime(800, riserCtx.currentTime + 0.2)
      riserEnv.gain.setValueAtTime(0, riserCtx.currentTime)
      riserEnv.gain.linearRampToValueAtTime(0.1, riserCtx.currentTime + 0.1)
      riserEnv.gain.exponentialRampToValueAtTime(0.01, riserCtx.currentTime + 0.25)
      riserOsc.connect(riserEnv)
      riserEnv.connect(gainNodeRef.current)
      riserOsc.start(riserCtx.currentTime)
      riserOsc.stop(riserCtx.currentTime + 0.3)
    }, 100)

    // Layer 6: Final punch at the end
    setTimeout(() => {
      if (!audioContextRef.current || !gainNodeRef.current) return
      const punchCtx = audioContextRef.current
      
      const punchOsc = punchCtx.createOscillator()
      const punchEnv = punchCtx.createGain()
      punchOsc.type = "triangle"
      punchOsc.frequency.setValueAtTime(150, punchCtx.currentTime)
      punchOsc.frequency.exponentialRampToValueAtTime(60, punchCtx.currentTime + 0.15)
      punchEnv.gain.setValueAtTime(0, punchCtx.currentTime)
      punchEnv.gain.linearRampToValueAtTime(0.25, punchCtx.currentTime + 0.01)
      punchEnv.gain.exponentialRampToValueAtTime(0.01, punchCtx.currentTime + 0.2)
      punchOsc.connect(punchEnv)
      punchEnv.connect(gainNodeRef.current)
      punchOsc.start(punchCtx.currentTime)
      punchOsc.stop(punchCtx.currentTime + 0.25)
    }, 300)

  }, [isMuted, initAudioContext])

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
    playTiebreaker,
    isMuted,
    setMuted,
    volume,
    setVolume,
  }
}
