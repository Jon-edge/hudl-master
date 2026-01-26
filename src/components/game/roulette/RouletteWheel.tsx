"use client"

import * as React from "react"
import { useRef, useEffect, useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import type { RouletteConfig, RouletteSlot } from "./types"
import { getWheelSlots } from "./types"
import type { BallState } from "./hooks/useRoulettePhysics"

export interface RouletteWheelProps {
  config: RouletteConfig
  wheelAngle: number
  ball: BallState | null
  isSpinning: boolean
  winningSlot?: RouletteSlot | null
  playerCount?: number
  className?: string
}

/**
 * Renders a photorealistic roulette wheel using canvas
 */
export function RouletteWheel({
  config,
  wheelAngle,
  ball,
  isSpinning,
  winningSlot,
  playerCount,
  className,
}: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: config.wheelSize, height: config.wheelSize })

  const slots = getWheelSlots(config.wheelStyle, playerCount)
  const wheelRadius = config.wheelSize / 2
  const trackRadius = wheelRadius * 0.85
  const pocketRadius = wheelRadius * 0.55
  const innerRadius = wheelRadius * 0.35
  const centerRadius = wheelRadius * 0.12
  
  // Draw the wheel
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2
    
    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)
    
    // === OUTER RIM (Polished mahogany wood) ===
    const woodGradient = ctx.createRadialGradient(
      centerX, centerY, trackRadius,
      centerX, centerY, wheelRadius
    )
    woodGradient.addColorStop(0, "#5d3a1a")
    woodGradient.addColorStop(0.3, "#8b5a2b")
    woodGradient.addColorStop(0.5, "#a0522d")
    woodGradient.addColorStop(0.7, "#8b4513")
    woodGradient.addColorStop(1, "#4a2c17")
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, wheelRadius, 0, 2 * Math.PI)
    ctx.fillStyle = woodGradient
    ctx.fill()
    
    // Wood grain texture effect
    ctx.save()
    ctx.globalAlpha = 0.1
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(centerX + Math.cos(angle) * trackRadius, centerY + Math.sin(angle) * trackRadius)
      ctx.lineTo(centerX + Math.cos(angle) * wheelRadius, centerY + Math.sin(angle) * wheelRadius)
      ctx.strokeStyle = "#2d1810"
      ctx.lineWidth = 3
      ctx.stroke()
    }
    ctx.restore()
    
    // Polished rim edge
    ctx.beginPath()
    ctx.arc(centerX, centerY, wheelRadius - 2, 0, 2 * Math.PI)
    ctx.strokeStyle = "#daa520"
    ctx.lineWidth = 3
    ctx.stroke()
    
    // === BALL TRACK (Polished chrome) ===
    const trackGradient = ctx.createRadialGradient(
      centerX - wheelRadius * 0.2, centerY - wheelRadius * 0.2, 0,
      centerX, centerY, trackRadius
    )
    trackGradient.addColorStop(0, "#e8e8e8")
    trackGradient.addColorStop(0.3, "#c0c0c0")
    trackGradient.addColorStop(0.6, "#a0a0a0")
    trackGradient.addColorStop(1, "#808080")
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, trackRadius, 0, 2 * Math.PI)
    ctx.fillStyle = trackGradient
    ctx.fill()
    
    // Track inner edge
    ctx.beginPath()
    ctx.arc(centerX, centerY, pocketRadius + 5, 0, 2 * Math.PI)
    ctx.strokeStyle = "#606060"
    ctx.lineWidth = 2
    ctx.stroke()
    
    // === DIAMOND DEFLECTORS ===
    const deflectorCount = config.deflectorCount
    ctx.save()
    ctx.translate(centerX, centerY)
    
    for (let i = 0; i < deflectorCount; i++) {
      const angle = (i / deflectorCount) * 2 * Math.PI
      const deflectorRadius = trackRadius * 0.92
      const x = Math.cos(angle) * deflectorRadius
      const y = Math.sin(angle) * deflectorRadius
      
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle + Math.PI / 2)
      
      // Diamond shape
      ctx.beginPath()
      ctx.moveTo(0, -8)
      ctx.lineTo(5, 0)
      ctx.lineTo(0, 8)
      ctx.lineTo(-5, 0)
      ctx.closePath()
      
      // Gold metallic gradient
      const diamondGrad = ctx.createLinearGradient(-5, -8, 5, 8)
      diamondGrad.addColorStop(0, "#ffd700")
      diamondGrad.addColorStop(0.3, "#ffec8b")
      diamondGrad.addColorStop(0.5, "#ffd700")
      diamondGrad.addColorStop(0.7, "#daa520")
      diamondGrad.addColorStop(1, "#b8860b")
      
      ctx.fillStyle = diamondGrad
      ctx.fill()
      ctx.strokeStyle = "#8b7500"
      ctx.lineWidth = 1
      ctx.stroke()
      
      ctx.restore()
    }
    ctx.restore()
    
    // === ROTATING WHEEL SECTION (with pockets) ===
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(wheelAngle)
    
    // Pocket base (dark felt-like surface)
    const pocketGradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, pocketRadius)
    pocketGradient.addColorStop(0, "#1a1a2e")
    pocketGradient.addColorStop(0.5, "#16213e")
    pocketGradient.addColorStop(1, "#0f0f1a")
    
    ctx.beginPath()
    ctx.arc(0, 0, pocketRadius, 0, 2 * Math.PI)
    ctx.fillStyle = pocketGradient
    ctx.fill()
    
    // === DRAW SLOTS ===
    const slotAngle = (2 * Math.PI) / slots.length
    
    slots.forEach((slot, index) => {
      const startAngle = index * slotAngle - Math.PI / 2
      const endAngle = startAngle + slotAngle
      
      // Slot color
      let slotColor: string
      let slotHighlight: string
      if (slot.color === "green") {
        slotColor = "#006400"
        slotHighlight = "#228b22"
      } else if (slot.color === "red") {
        slotColor = "#8b0000"
        slotHighlight = "#cd5c5c"
      } else {
        slotColor = "#1a1a1a"
        slotHighlight = "#3a3a3a"
      }
      
      // Draw slot
      ctx.beginPath()
      ctx.moveTo(
        Math.cos(startAngle) * innerRadius,
        Math.sin(startAngle) * innerRadius
      )
      ctx.arc(0, 0, pocketRadius - 2, startAngle, endAngle)
      ctx.lineTo(
        Math.cos(endAngle) * innerRadius,
        Math.sin(endAngle) * innerRadius
      )
      ctx.arc(0, 0, innerRadius, endAngle, startAngle, true)
      ctx.closePath()
      
      // Gradient for 3D effect
      const midAngle = (startAngle + endAngle) / 2
      const grad = ctx.createRadialGradient(
        Math.cos(midAngle) * innerRadius * 0.5,
        Math.sin(midAngle) * innerRadius * 0.5,
        0,
        0, 0, pocketRadius
      )
      grad.addColorStop(0, slotHighlight)
      grad.addColorStop(0.5, slotColor)
      grad.addColorStop(1, slotColor)
      
      ctx.fillStyle = grad
      ctx.fill()
      
      // Highlight winning slot
      if (winningSlot && slot.number === winningSlot.number && !isSpinning) {
        ctx.save()
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 200) * 0.4
        ctx.strokeStyle = "#ffd700"
        ctx.lineWidth = 4
        ctx.stroke()
        ctx.restore()
      }
      
      // Slot dividers (frets)
      ctx.beginPath()
      ctx.moveTo(
        Math.cos(startAngle) * (innerRadius + 2),
        Math.sin(startAngle) * (innerRadius + 2)
      )
      ctx.lineTo(
        Math.cos(startAngle) * (pocketRadius - 3),
        Math.sin(startAngle) * (pocketRadius - 3)
      )
      ctx.strokeStyle = "#c0c0c0"
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Number text
      const textRadius = (innerRadius + pocketRadius) / 2 + 5
      const textAngle = midAngle
      
      ctx.save()
      ctx.translate(
        Math.cos(textAngle) * textRadius,
        Math.sin(textAngle) * textRadius
      )
      ctx.rotate(textAngle + Math.PI / 2)
      
      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${Math.max(10, Math.floor(config.wheelSize / 40))}px "Playfair Display", Georgia, serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
      ctx.shadowBlur = 2
      ctx.fillText(slot.displayText, 0, 0)
      
      ctx.restore()
    })
    
    // === INNER CONE ===
    const coneGradient = ctx.createRadialGradient(
      -innerRadius * 0.3, -innerRadius * 0.3, 0,
      0, 0, innerRadius
    )
    coneGradient.addColorStop(0, "#daa520")
    coneGradient.addColorStop(0.3, "#b8860b")
    coneGradient.addColorStop(0.7, "#8b6914")
    coneGradient.addColorStop(1, "#5d4e37")
    
    ctx.beginPath()
    ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI)
    ctx.fillStyle = coneGradient
    ctx.fill()
    
    // Cone ridges for 3D effect
    ctx.save()
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * centerRadius, Math.sin(angle) * centerRadius)
      ctx.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius)
      ctx.strokeStyle = i % 2 === 0 ? "#ffd700" : "#5d4e37"
      ctx.lineWidth = 2
      ctx.stroke()
    }
    ctx.restore()
    
    // === CENTER HUB ===
    const hubGradient = ctx.createRadialGradient(
      -centerRadius * 0.3, -centerRadius * 0.3, 0,
      0, 0, centerRadius
    )
    hubGradient.addColorStop(0, "#ffd700")
    hubGradient.addColorStop(0.4, "#daa520")
    hubGradient.addColorStop(0.8, "#b8860b")
    hubGradient.addColorStop(1, "#8b6914")
    
    ctx.beginPath()
    ctx.arc(0, 0, centerRadius, 0, 2 * Math.PI)
    ctx.fillStyle = hubGradient
    ctx.fill()
    ctx.strokeStyle = "#5d4e37"
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Hub decorative pattern
    ctx.beginPath()
    ctx.arc(0, 0, centerRadius * 0.6, 0, 2 * Math.PI)
    ctx.strokeStyle = "#8b6914"
    ctx.lineWidth = 1.5
    ctx.stroke()
    
    ctx.restore() // End wheel rotation
    
    // === BALL ===
    if (ball) {
      const ballX = centerX + ball.x
      const ballY = centerY + ball.y
      const ballRadius = config.ballSize
      
      // Ball shadow
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.ellipse(ballX + 3, ballY + 3, ballRadius, ballRadius * 0.8, 0, 0, 2 * Math.PI)
      ctx.fillStyle = "#000"
      ctx.fill()
      ctx.restore()
      
      // Main ball (ivory/white)
      const ballGradient = ctx.createRadialGradient(
        ballX - ballRadius * 0.3, ballY - ballRadius * 0.3, 0,
        ballX, ballY, ballRadius
      )
      ballGradient.addColorStop(0, "#ffffff")
      ballGradient.addColorStop(0.3, "#f5f5dc")
      ballGradient.addColorStop(0.7, "#dcdcaa")
      ballGradient.addColorStop(1, "#b8a88a")
      
      ctx.beginPath()
      ctx.arc(ballX, ballY, ballRadius, 0, 2 * Math.PI)
      ctx.fillStyle = ballGradient
      ctx.fill()
      
      // Ball highlight
      ctx.beginPath()
      ctx.arc(ballX - ballRadius * 0.2, ballY - ballRadius * 0.2, ballRadius * 0.3, 0, 2 * Math.PI)
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
      ctx.fill()
      
      // Ball motion blur when moving fast
      if (isSpinning && ball.angularVelocity && Math.abs(ball.angularVelocity) > 1) {
        ctx.save()
        ctx.globalAlpha = 0.15
        for (let i = 1; i <= 3; i++) {
          const trailAngle = ball.angle - ball.angularVelocity * 0.02 * i
          const trailX = centerX + Math.cos(trailAngle) * ball.radius
          const trailY = centerY + Math.sin(trailAngle) * ball.radius
          
          ctx.beginPath()
          ctx.arc(trailX, trailY, ballRadius * (1 - i * 0.2), 0, 2 * Math.PI)
          ctx.fillStyle = "#f5f5dc"
          ctx.fill()
        }
        ctx.restore()
      }
    }
    
    // === OUTER GLASS REFLECTION ===
    ctx.save()
    ctx.globalAlpha = 0.08
    const reflectionGrad = ctx.createLinearGradient(
      centerX - wheelRadius, centerY - wheelRadius,
      centerX + wheelRadius, centerY + wheelRadius
    )
    reflectionGrad.addColorStop(0, "#ffffff")
    reflectionGrad.addColorStop(0.5, "transparent")
    reflectionGrad.addColorStop(1, "#ffffff")
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, wheelRadius - 5, 0, 2 * Math.PI)
    ctx.fillStyle = reflectionGrad
    ctx.fill()
    ctx.restore()
    
  }, [ball, config.ballSize, config.deflectorCount, config.wheelSize, config.wheelStyle, dimensions.height, dimensions.width, innerRadius, isSpinning, pocketRadius, slots, trackRadius, wheelAngle, wheelRadius, winningSlot, centerRadius])
  
  // Animation loop for continuous redraw
  const animationRef = useRef<number | null>(null)
  
  useEffect(() => {
    const animate = () => {
      draw()
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [draw])
  
  // Update dimensions when config changes
  useEffect(() => {
    setDimensions({ width: config.wheelSize, height: config.wheelSize })
  }, [config.wheelSize])
  
  return (
    <div className={cn("relative", className)}>
      {/* Glow effect behind wheel */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: isSpinning 
            ? "radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(139, 69, 19, 0.2) 0%, transparent 70%)",
          transform: "scale(1.1)",
          filter: "blur(20px)",
          transition: "all 0.5s ease",
        }}
      />
      
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="relative z-10"
        style={{
          filter: isSpinning 
            ? "drop-shadow(0 0 20px rgba(255, 215, 0, 0.4))"
            : "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))",
          transition: "filter 0.3s ease",
        }}
      />
      
      {/* Winning number display */}
      {winningSlot && !isSpinning && (
        <div 
          className={cn(
            "absolute left-1/2 -translate-x-1/2 -bottom-4 z-20",
            "px-6 py-3 rounded-xl font-bold text-2xl",
            "animate-winner-pop shadow-2xl border-2",
            winningSlot.color === "red" && "bg-red-700 border-red-400 text-white",
            winningSlot.color === "black" && "bg-gray-900 border-gray-500 text-white",
            winningSlot.color === "green" && "bg-green-700 border-green-400 text-white",
          )}
          style={{
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            boxShadow: `0 0 30px ${
              winningSlot.color === "red" ? "rgba(220, 38, 38, 0.5)" :
              winningSlot.color === "green" ? "rgba(22, 163, 74, 0.5)" :
              "rgba(100, 100, 100, 0.5)"
            }`,
          }}
        >
          {winningSlot.displayText}
        </div>
      )}
    </div>
  )
}

