import { useCallback, useRef } from "react"

export function useGameSounds(enabled: boolean = true) {
  const audioContextRef = useRef<AudioContext | null>(null)

  const getContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }

  const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    if (!enabled) return
    const ctx = getContext()
    if (ctx.state === "suspended") ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  const playCollision = useCallback((velocity: number = 1) => {
    // Pitch varies slightly by velocity
    const pitch = 800 + Math.random() * 200
    playTone(pitch, "sine", 0.1, Math.min(0.1, velocity * 0.05))
  }, [enabled])

  const playBucket = useCallback(() => {
    playTone(440, "triangle", 0.5, 0.2) // A4
    setTimeout(() => playTone(554, "triangle", 0.5, 0.2), 100) // C#5
  }, [enabled])

  const playWin = useCallback(() => {
    const now = getContext().currentTime
    const notes = [523.25, 659.25, 783.99, 1046.50] // C major
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, "square", 0.8, 0.3), i * 150)
    })
  }, [enabled])

  return {
    playCollision,
    playBucket,
    playWin
  }
}
