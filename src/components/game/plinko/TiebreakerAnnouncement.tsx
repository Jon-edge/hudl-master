"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

export interface TiebreakerAnnouncementProps {
  isVisible: boolean
  roundNumber?: number
  onComplete?: () => void
  className?: string
}

/**
 * TiebreakerAnnouncement - Dramatic gaming-style announcement that flashes across the board
 */
export function TiebreakerAnnouncement({
  isVisible,
  roundNumber = 1,
  onComplete,
  className,
}: TiebreakerAnnouncementProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit" | "done">("done")
  const [glitchText, setGlitchText] = useState("TIEBREAKER")

  // Glitch effect for the text
  const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`"
  
  const createGlitchText = useCallback(() => {
    const baseText = "TIEBREAKER"
    let result = ""
    for (let i = 0; i < baseText.length; i++) {
      if (Math.random() < 0.3) {
        result += glitchChars[Math.floor(Math.random() * glitchChars.length)]
      } else {
        result += baseText[i]
      }
    }
    return result
  }, [])

  useEffect(() => {
    if (!isVisible) {
      setPhase("done")
      return
    }

    // Start the animation sequence
    setPhase("enter")
    
    // Glitch effect during enter phase
    const glitchInterval = setInterval(() => {
      setGlitchText(createGlitchText())
    }, 50)

    // Hold phase after entrance
    const holdTimer = setTimeout(() => {
      clearInterval(glitchInterval)
      setGlitchText("TIEBREAKER")
      setPhase("hold")
    }, 400)

    // Exit phase
    const exitTimer = setTimeout(() => {
      setPhase("exit")
    }, 1600)

    // Complete
    const completeTimer = setTimeout(() => {
      setPhase("done")
      onComplete?.()
    }, 2000)

    return () => {
      clearInterval(glitchInterval)
      clearTimeout(holdTimer)
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [isVisible, onComplete, createGlitchText])

  if (phase === "done") return null

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 pointer-events-none overflow-hidden",
        "flex items-center justify-center",
        className
      )}
    >
      {/* Scanline overlay effect */}
      <div 
        className={cn(
          "absolute inset-0 opacity-20 pointer-events-none",
          "bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]",
          phase === "enter" && "animate-[scanlines_0.1s_linear_infinite]",
        )}
      />

      {/* Flash effect on enter */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-100",
          phase === "enter" ? "bg-white/30 opacity-100" : "opacity-0"
        )}
      />

      {/* Main content container */}
      <div
        className={cn(
          "relative flex flex-col items-center",
          "transform transition-all",
          phase === "enter" && "animate-[tiebreaker-enter_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]",
          phase === "hold" && "scale-100 opacity-100",
          phase === "exit" && "animate-[tiebreaker-exit_0.4s_cubic-bezier(0.7,0,0.84,0)_forwards]",
        )}
      >
        {/* Background glow burst */}
        <div 
          className={cn(
            "absolute inset-0 -inset-x-20 -inset-y-10",
            "bg-gradient-to-r from-transparent via-amber-500/20 to-transparent",
            "blur-xl",
            phase === "hold" && "animate-pulse"
          )}
        />

        {/* Electric lines left */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-1">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-amber-400 animate-[electric-left_0.15s_linear_infinite]" />
        </div>

        {/* Electric lines right */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-1">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-cyan-400 to-amber-400 animate-[electric-right_0.15s_linear_infinite]" />
        </div>

        {/* Main text with multiple layers for depth */}
        <div className="relative">
          {/* Shadow/depth layer */}
          <div 
            className="absolute inset-0 text-black/30 blur-sm"
            style={{ transform: "translate(3px, 3px)" }}
          >
            <span className="text-4xl md:text-6xl font-black tracking-tighter">
              TIEBREAKER
            </span>
          </div>

          {/* Chromatic aberration effect - red */}
          <div 
            className={cn(
              "absolute inset-0 text-red-500/50",
              phase === "enter" && "animate-[chromatic-red_0.1s_linear_infinite]"
            )}
            style={{ transform: "translate(-2px, 0)" }}
          >
            <span className="text-4xl md:text-6xl font-black tracking-tighter">
              {glitchText}
            </span>
          </div>

          {/* Chromatic aberration effect - cyan */}
          <div 
            className={cn(
              "absolute inset-0 text-cyan-400/50",
              phase === "enter" && "animate-[chromatic-cyan_0.1s_linear_infinite]"
            )}
            style={{ transform: "translate(2px, 0)" }}
          >
            <span className="text-4xl md:text-6xl font-black tracking-tighter">
              {glitchText}
            </span>
          </div>

          {/* Main text - gradient */}
          <div className="relative">
            <span 
              className={cn(
                "text-4xl md:text-6xl font-black tracking-tighter",
                "bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300 bg-clip-text text-transparent",
                "drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]",
                "drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]",
              )}
              style={{
                textShadow: "0 0 40px rgba(251, 191, 36, 0.6), 0 0 80px rgba(251, 191, 36, 0.4)",
                WebkitTextStroke: "1px rgba(255, 255, 255, 0.3)",
              }}
            >
              {phase === "enter" ? glitchText : "TIEBREAKER"}
            </span>
          </div>
        </div>

        {/* Subtext with round number */}
        <div 
          className={cn(
            "relative mt-2 flex items-center gap-3",
            "text-white/90 text-sm md:text-base font-bold uppercase tracking-[0.3em]",
            phase === "enter" && "opacity-0",
            phase === "hold" && "animate-[fade-up_0.3s_ease-out_0.2s_forwards] opacity-0",
            phase === "exit" && "opacity-100",
          )}
        >
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-400" />
          <span className="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
            ROUND {roundNumber + 1}
          </span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-400" />
        </div>

        {/* Decorative corner accents */}
        <svg className="absolute -top-6 -left-6 w-8 h-8 text-amber-400/60" viewBox="0 0 24 24" fill="none">
          <path d="M2 12V2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg className="absolute -top-6 -right-6 w-8 h-8 text-amber-400/60" viewBox="0 0 24 24" fill="none">
          <path d="M22 12V2H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg className="absolute -bottom-6 -left-6 w-8 h-8 text-amber-400/60" viewBox="0 0 24 24" fill="none">
          <path d="M2 12v10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg className="absolute -bottom-6 -right-6 w-8 h-8 text-amber-400/60" viewBox="0 0 24 24" fill="none">
          <path d="M22 12v10H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Horizontal slice lines that shoot across */}
      <div 
        className={cn(
          "absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent",
          "top-[45%] opacity-0",
          phase === "enter" && "animate-[slice-line_0.3s_ease-out_forwards]"
        )}
      />
      <div 
        className={cn(
          "absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent",
          "top-[55%] opacity-0",
          phase === "enter" && "animate-[slice-line_0.3s_ease-out_0.05s_forwards]"
        )}
      />
    </div>
  )
}

