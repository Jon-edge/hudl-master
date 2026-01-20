"use client"

import { useEffect, useMemo, useRef } from "react"

interface GameSounds {
  playCollision: (speed?: number) => void
  playBucket: () => void
  playWin: () => void
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const useGameSounds = (enabled: boolean): GameSounds => {
  const enabledRef = useRef(enabled)
  const lastCollisionRef = useRef(0)

  const sounds = useMemo(() => {
    const collision = new Audio("/sounds/collision.wav")
    const bucket = new Audio("/sounds/bucket.wav")
    const win = new Audio("/sounds/win.wav")
    collision.preload = "auto"
    bucket.preload = "auto"
    win.preload = "auto"
    collision.volume = 0.5
    bucket.volume = 0.65
    win.volume = 0.75
    return { collision, bucket, win }
  }, [])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  const safePlay = (audio: HTMLAudioElement) => {
    if (!enabledRef.current) return
    try {
      audio.currentTime = 0
      const promise = audio.play()
      if (promise != null && typeof promise.catch === "function") {
        promise.catch(() => {})
      }
    } catch {
      // Ignore autoplay or unsupported format errors.
    }
  }

  const playCollision = (speed?: number) => {
    const now = performance.now()
    if (now - lastCollisionRef.current < 70) return
    lastCollisionRef.current = now
    if (speed != null) {
      sounds.collision.volume = clamp(0.2 + speed / 8, 0.2, 0.7)
    }
    safePlay(sounds.collision)
  }

  const playBucket = () => safePlay(sounds.bucket)
  const playWin = () => safePlay(sounds.win)

  return { playCollision, playBucket, playWin }
}
