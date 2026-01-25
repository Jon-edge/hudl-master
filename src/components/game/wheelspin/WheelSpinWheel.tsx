"use client"

import * as React from "react"
import { useRef, useEffect, useCallback, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { PlayerProfile } from "../plinko/types"
import { type WheelSpinConfig, type WheelSegment, WHEEL_COLORS, defaultWheelSpinConfig } from "./types"

export interface WheelSpinWheelProps {
  players: PlayerProfile[]
  config?: Partial<WheelSpinConfig>
  isSpinning: boolean
  onSpinComplete?: (winner: PlayerProfile, winningSegmentIndex: number) => void
  className?: string
}

// Custom easing function for realistic wheel deceleration
function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

// More dramatic deceleration at the end
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

// Combined easing for realistic wheel spin
function wheelEasing(t: number): number {
  // Start fast, gradually slow down with dramatic stop
  if (t < 0.7) {
    return easeOutQuint(t / 0.7) * 0.85
  }
  return 0.85 + easeOutExpo((t - 0.7) / 0.3) * 0.15
}

export function WheelSpinWheel({
  players,
  config: configOverrides,
  isSpinning,
  onSpinComplete,
  className,
}: WheelSpinWheelProps) {
  const config = { ...defaultWheelSpinConfig, ...configOverrides }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const spinStartRef = useRef<number | null>(null)
  const spinTargetRef = useRef<number>(0)
  const hasCompletedRef = useRef(false)
  const [currentRotation, setCurrentRotation] = useState(0)
  
  // Create wheel segments from players
  const segments = useMemo((): WheelSegment[] => {
    if (players.length === 0) return []
    
    const segmentAngle = (2 * Math.PI) / players.length
    return players.map((player, i) => ({
      player,
      startAngle: i * segmentAngle,
      endAngle: (i + 1) * segmentAngle,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length],
    }))
  }, [players])

  // Calculate winner based on rotation
  const getWinnerFromRotation = useCallback((rotation: number): { winner: PlayerProfile; index: number } | null => {
    if (segments.length === 0) return null
    
    // Normalize rotation to 0-2π range
    const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    // The pointer is at the top (Math.PI / 2), find which segment is there
    // The wheel rotates clockwise, so we need to find segment at (PI/2 - rotation)
    const pointerAngle = ((Math.PI / 2 - normalizedRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      if (pointerAngle >= seg.startAngle && pointerAngle < seg.endAngle) {
        return { winner: seg.player, index: i }
      }
    }
    
    return { winner: segments[0].player, index: 0 }
  }, [segments])

  // Spin animation
  useEffect(() => {
    if (!isSpinning) {
      hasCompletedRef.current = false
      return
    }
    
    // Calculate spin target
    const spins = config.minSpins + Math.random() * (config.maxSpins - config.minSpins)
    const extraAngle = Math.random() * 2 * Math.PI
    const targetRotation = rotationRef.current + spins * 2 * Math.PI + extraAngle
    spinTargetRef.current = targetRotation
    spinStartRef.current = performance.now()
    hasCompletedRef.current = false
    
    const animate = (time: number) => {
      if (!spinStartRef.current) {
        spinStartRef.current = time
      }
      
      const elapsed = time - spinStartRef.current
      const progress = Math.min(elapsed / config.spinDuration, 1)
      const easedProgress = wheelEasing(progress)
      
      const startRotation = rotationRef.current
      const rotationDelta = spinTargetRef.current - startRotation
      const newRotation = startRotation + rotationDelta * easedProgress
      
      setCurrentRotation(newRotation)
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        rotationRef.current = spinTargetRef.current
        setCurrentRotation(spinTargetRef.current)
        
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          const result = getWinnerFromRotation(spinTargetRef.current)
          if (result && onSpinComplete) {
            onSpinComplete(result.winner, result.index)
          }
        }
      }
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isSpinning, config.spinDuration, config.minSpins, config.maxSpins, getWinnerFromRotation, onSpinComplete])

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const size = config.wheelSize
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)
    
    const centerX = size / 2
    const centerY = size / 2
    const outerRadius = size / 2 - 10
    const innerRadius = outerRadius * config.innerWheelRatio
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size)
    
    // Draw outer ring shadow
    ctx.save()
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)"
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 5
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius + 5, 0, 2 * Math.PI)
    ctx.fillStyle = "#1a1a2e"
    ctx.fill()
    ctx.restore()
    
    // Rotate canvas for wheel rotation
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(currentRotation)
    ctx.translate(-centerX, -centerY)
    
    // Draw segments
    segments.forEach((segment, i) => {
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, outerRadius, segment.startAngle - Math.PI / 2, segment.endAngle - Math.PI / 2)
      ctx.closePath()
      
      // Gradient fill for 3D effect
      const midAngle = (segment.startAngle + segment.endAngle) / 2 - Math.PI / 2
      const gradientX = centerX + Math.cos(midAngle) * (outerRadius * 0.5)
      const gradientY = centerY + Math.sin(midAngle) * (outerRadius * 0.5)
      const gradient = ctx.createRadialGradient(
        centerX, centerY, innerRadius,
        gradientX, gradientY, outerRadius
      )
      gradient.addColorStop(0, segment.color)
      gradient.addColorStop(1, segment.color.replace("0.7", "0.55"))
      
      ctx.fillStyle = gradient
      ctx.fill()
      
      // Segment border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Draw player name/avatar
      if (config.showPlayerNames || config.showPlayerAvatars) {
        const textAngle = midAngle
        const textRadius = outerRadius * 0.7
        const textX = centerX + Math.cos(textAngle) * textRadius
        const textY = centerY + Math.sin(textAngle) * textRadius
        
        ctx.save()
        ctx.translate(textX, textY)
        ctx.rotate(textAngle + Math.PI / 2)
        
        // Player name
        if (config.showPlayerNames) {
          const name = segment.player.name.length > 10 
            ? segment.player.name.slice(0, 9) + "…" 
            : segment.player.name
          ctx.font = "bold 14px system-ui, sans-serif"
          ctx.fillStyle = "white"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
          ctx.shadowBlur = 4
          ctx.fillText(name, 0, 0)
        }
        
        ctx.restore()
      }
    })
    
    ctx.restore()
    
    // Draw inner circle (hub)
    const hubGradient = ctx.createRadialGradient(
      centerX - 10, centerY - 10, 0,
      centerX, centerY, innerRadius
    )
    hubGradient.addColorStop(0, "#4a4a6a")
    hubGradient.addColorStop(0.5, "#2a2a4a")
    hubGradient.addColorStop(1, "#1a1a2e")
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI)
    ctx.fillStyle = hubGradient
    ctx.fill()
    
    // Hub highlight
    ctx.beginPath()
    ctx.arc(centerX - innerRadius * 0.2, centerY - innerRadius * 0.2, innerRadius * 0.4, 0, 2 * Math.PI)
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
    ctx.fill()
    
    // Hub border
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = 3
    ctx.stroke()
    
    // Draw outer ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius + 3, 0, 2 * Math.PI)
    ctx.strokeStyle = "linear-gradient(135deg, #ffd700, #ff8c00)"
    ctx.lineWidth = 6
    
    // Metallic ring gradient
    const ringGradient = ctx.createLinearGradient(0, 0, size, size)
    ringGradient.addColorStop(0, "#ffd700")
    ringGradient.addColorStop(0.5, "#ffec8b")
    ringGradient.addColorStop(1, "#daa520")
    ctx.strokeStyle = ringGradient
    ctx.stroke()
    
    // Tick marks around the wheel
    const tickCount = Math.max(segments.length * 2, 24)
    for (let i = 0; i < tickCount; i++) {
      const tickAngle = (i / tickCount) * 2 * Math.PI - Math.PI / 2
      const tickOuter = outerRadius + 2
      const tickInner = outerRadius - 8
      
      ctx.beginPath()
      ctx.moveTo(
        centerX + Math.cos(tickAngle) * tickInner,
        centerY + Math.sin(tickAngle) * tickInner
      )
      ctx.lineTo(
        centerX + Math.cos(tickAngle) * tickOuter,
        centerY + Math.sin(tickAngle) * tickOuter
      )
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"
      ctx.lineWidth = i % 2 === 0 ? 2 : 1
      ctx.stroke()
    }
    
  }, [segments, currentRotation, config.wheelSize, config.innerWheelRatio, config.showPlayerNames, config.showPlayerAvatars])

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Wheel */}
      <canvas
        ref={canvasRef}
        className={cn(
          "rounded-full",
          isSpinning && "drop-shadow-[0_0_30px_rgba(255,200,100,0.5)]"
        )}
        style={{
          width: config.wheelSize,
          height: config.wheelSize,
        }}
      />
      
      {/* Pointer/Arrow at top */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 -top-2 z-10"
        style={{ filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))" }}
      >
        <svg width="40" height="50" viewBox="0 0 40 50">
          <defs>
            <linearGradient id="pointerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="50%" stopColor="#ffec8b" />
              <stop offset="100%" stopColor="#daa520" />
            </linearGradient>
          </defs>
          <path
            d="M20 50 L5 10 Q5 0 20 0 Q35 0 35 10 L20 50"
            fill="url(#pointerGradient)"
            stroke="#b8860b"
            strokeWidth="2"
          />
          <ellipse cx="20" cy="8" rx="8" ry="5" fill="rgba(255, 255, 255, 0.3)" />
        </svg>
      </div>
      
      {/* Light bulbs around the rim */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * 2 * Math.PI - Math.PI / 2
          const radius = config.wheelSize / 2 + 12
          const x = config.wheelSize / 2 + Math.cos(angle) * radius
          const y = config.wheelSize / 2 + Math.sin(angle) * radius
          const isLit = isSpinning ? Math.floor(Date.now() / 100 + i) % 2 === 0 : i % 2 === 0
          
          return (
            <div
              key={i}
              className={cn(
                "absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-100",
                isLit 
                  ? "bg-yellow-300 shadow-[0_0_8px_rgba(255,220,100,0.8)]" 
                  : "bg-amber-800"
              )}
              style={{ left: x, top: y }}
            />
          )
        })}
      </div>
    </div>
  )
}
