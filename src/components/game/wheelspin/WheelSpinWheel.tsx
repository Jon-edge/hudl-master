"use client"

import * as React from "react"
import { useRef, useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { PlayerProfile } from "../plinko/types"
import { type WheelSpinConfig, type WheelSegment, type SpecialSpaceType, WHEEL_COLORS, SPECIAL_SPACES, defaultWheelSpinConfig } from "./types"

// Result of a spin - either a player or a special space
export interface SpinResult {
  type: "player" | "special"
  player?: PlayerProfile
  specialType?: SpecialSpaceType
  segmentIndex: number
}

export interface WheelSpinWheelProps {
  players: PlayerProfile[]
  config?: Partial<WheelSpinConfig>
  isSpinning: boolean
  spinDirection?: 1 | -1 // 1 = clockwise (default), -1 = counter-clockwise
  onSpinComplete?: (result: SpinResult) => void
  className?: string
}

// Custom easing function for realistic wheel deceleration
// Using a quintic curve creates a strong initial spin that slows down very smoothly
function wheelEasing(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

// Carnival marquee bulb colors
const BULB_COLORS = [
  { on: "#FF4444", off: "#661111", glow: "rgba(255, 68, 68, 0.8)" },    // Red
  { on: "#FFDD44", off: "#665511", glow: "rgba(255, 221, 68, 0.8)" },   // Yellow
  { on: "#44FF44", off: "#116611", glow: "rgba(68, 255, 68, 0.8)" },    // Green
  { on: "#44DDFF", off: "#115566", glow: "rgba(68, 221, 255, 0.8)" },   // Cyan
  { on: "#FF44FF", off: "#661166", glow: "rgba(255, 68, 255, 0.8)" },   // Magenta
]

export function WheelSpinWheel({
  players,
  config: configOverrides,
  isSpinning,
  spinDirection = 1,
  onSpinComplete,
  className,
}: WheelSpinWheelProps) {
  const config = { ...defaultWheelSpinConfig, ...configOverrides }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const spinStartRef = useRef<number | null>(null)
  const spinStartRotationRef = useRef<number>(0) // Capture start rotation at spin begin
  const spinTargetRef = useRef<number>(0)
  const hasCompletedRef = useRef(false)
  const onSpinCompleteRef = useRef(onSpinComplete) // Use ref to avoid effect dependency
  const [currentRotation, setCurrentRotation] = useState(0)
  const [bulbFrame, setBulbFrame] = useState(0)

  // Keep callback ref updated
  useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete
  }, [onSpinComplete])

  // Bulb animation - chase pattern when spinning, alternating when idle
  useEffect(() => {
    const interval = setInterval(() => {
      setBulbFrame(f => f + 1)
    }, isSpinning ? 80 : 500)
    return () => clearInterval(interval)
  }, [isSpinning])

  // Create wheel segments from players and special spaces
  const segments = useMemo((): WheelSegment[] => {
    if (players.length === 0) return []

    // Collect enabled special spaces
    const enabledSpecialSpaces: { type: SpecialSpaceType; count: number }[] = []
    const specialSpacesConfig = config.specialSpaces
    
    if (specialSpacesConfig) {
      (Object.keys(specialSpacesConfig) as SpecialSpaceType[]).forEach(spaceType => {
        const settings = specialSpacesConfig[spaceType]
        const spaceInfo = SPECIAL_SPACES[spaceType]
        // Only add if enabled and applicable to current game mode
        if (settings.enabled && spaceInfo.applicableModes.includes(config.gameMode)) {
          enabledSpecialSpaces.push({ type: spaceType, count: settings.count })
        }
      })
    }

    // Calculate total segments
    const totalSpecialSpaces = enabledSpecialSpaces.reduce((sum, s) => sum + s.count, 0)
    const totalSegments = players.length + totalSpecialSpaces
    const segmentAngle = (2 * Math.PI) / totalSegments

    // Build segments array - interleave special spaces with players
    const result: WheelSegment[] = []
    let playerIndex = 0
    let specialSpaceIndex = 0
    let currentAngle = 0

    // Distribute special spaces evenly among player segments
    const spacingInterval = totalSpecialSpaces > 0 
      ? Math.floor(players.length / (totalSpecialSpaces + 1))
      : players.length + 1

    // Build flat list of special space types
    const specialSpaceList: SpecialSpaceType[] = []
    enabledSpecialSpaces.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        specialSpaceList.push(type)
      }
    })

    for (let i = 0; i < totalSegments; i++) {
      const startAngle = currentAngle
      const endAngle = currentAngle + segmentAngle

      // Decide if this slot is a special space or player
      // Insert special space every `spacingInterval` player segments
      const shouldInsertSpecial = 
        specialSpaceIndex < specialSpaceList.length && 
        playerIndex > 0 && 
        playerIndex % spacingInterval === 0

      if (shouldInsertSpecial) {
        const spaceType = specialSpaceList[specialSpaceIndex]
        const spaceInfo = SPECIAL_SPACES[spaceType]
        result.push({
          type: "special",
          specialType: spaceType,
          info: spaceInfo,
          startAngle,
          endAngle,
          color: spaceInfo.color,
        })
        specialSpaceIndex++
      } else if (playerIndex < players.length) {
        result.push({
          type: "player",
          player: players[playerIndex],
          startAngle,
          endAngle,
          color: WHEEL_COLORS[playerIndex % WHEEL_COLORS.length],
        })
        playerIndex++
      }

      currentAngle = endAngle
    }

    // Add any remaining special spaces at the end
    while (specialSpaceIndex < specialSpaceList.length) {
      const spaceType = specialSpaceList[specialSpaceIndex]
      const spaceInfo = SPECIAL_SPACES[spaceType]
      const startAngle = currentAngle
      const endAngle = currentAngle + segmentAngle
      result.push({
        type: "special",
        specialType: spaceType,
        info: spaceInfo,
        startAngle,
        endAngle,
        color: spaceInfo.color,
      })
      specialSpaceIndex++
      currentAngle = endAngle
    }

    return result
  }, [players, config.specialSpaces, config.gameMode])

  // Keep segments ref updated for use in animation callback
  const segmentsRef = useRef(segments)
  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])

  // Pre-load avatar images
  const [loadedAvatars, setLoadedAvatars] = useState<Map<string, HTMLImageElement>>(new Map())

  useEffect(() => {
    if (!config.showPlayerAvatars) {
      // Clear avatars when feature is disabled
      setLoadedAvatars(new Map())
      return
    }

    const playersWithAvatars = players.filter(p => p.avatarUrl)
    if (playersWithAvatars.length === 0) {
      setLoadedAvatars(new Map())
      return
    }

    // Track if this effect is still current (not stale from re-render)
    let isCurrent = true

    // Get current player IDs to clean up stale entries
    const currentPlayerIds = new Set(players.map(p => p.id))

    playersWithAvatars.forEach(player => {
      if (!player.avatarUrl) return

      const img = new Image()
      // Note: Not setting crossOrigin to avoid CORS issues with external avatar URLs
      // This means the canvas will be "tainted" and can't be exported, but we don't need that
      img.onload = () => {
        if (isCurrent) {
          // Update incrementally as each image loads
          setLoadedAvatars(prev => {
            const next = new Map(prev)
            // Clean up any stale player entries
            for (const id of next.keys()) {
              if (!currentPlayerIds.has(id)) {
                next.delete(id)
              }
            }
            next.set(player.id, img)
            return next
          })
        }
      }
      img.onerror = () => {
        // On error, remove from map if it exists (stale entry)
        if (isCurrent) {
          setLoadedAvatars(prev => {
            if (prev.has(player.id)) {
              const next = new Map(prev)
              next.delete(player.id)
              return next
            }
            return prev
          })
        }
      }
      img.src = player.avatarUrl
    })

    // Cleanup function to mark this effect as stale
    return () => {
      isCurrent = false
    }
  }, [players, config.showPlayerAvatars])

  // Calculate result based on rotation - uses the current segments
  const getResultFromRotation = (rotation: number, segs: WheelSegment[]): SpinResult | null => {
    if (segs.length === 0) return null

    // Normalize rotation to 0-2π range
    const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

    // The pointer is at the top of the screen.
    // Segments are drawn with an offset of -π/2, so segment 0 starts at the top when rotation is 0.
    // When the wheel rotates by R, the segment at the top has angle -R (in segment coordinates).
    // We need to find which segment contains the angle -R (normalized to 0-2π).
    const pointerAngle = ((2 * Math.PI - normalizedRotation) % (2 * Math.PI))

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      if (pointerAngle >= seg.startAngle && pointerAngle < seg.endAngle) {
        if (seg.type === "player") {
          return { type: "player", player: seg.player, segmentIndex: i }
        } else {
          return { type: "special", specialType: seg.specialType, segmentIndex: i }
        }
      }
    }

    // Edge case: if pointerAngle is exactly 0 or 2π, it should be segment 0
    const firstSeg = segs[0]
    if (firstSeg.type === "player") {
      return { type: "player", player: firstSeg.player, segmentIndex: 0 }
    } else {
      return { type: "special", specialType: firstSeg.specialType, segmentIndex: 0 }
    }
  }

  // Store config values in refs to avoid re-triggering animation
  const spinDurationRef = useRef(config.spinDuration)
  const minSpinsRef = useRef(config.minSpins)
  const maxSpinsRef = useRef(config.maxSpins)

  // Update refs when config changes (but don't trigger animation restart)
  useEffect(() => {
    spinDurationRef.current = config.spinDuration
    minSpinsRef.current = config.minSpins
    maxSpinsRef.current = config.maxSpins
  }, [config.spinDuration, config.minSpins, config.maxSpins])

  // Store spin direction in ref
  const spinDirectionRef = useRef(spinDirection)
  useEffect(() => {
    spinDirectionRef.current = spinDirection
  }, [spinDirection])

  // Spin animation - ONLY depends on isSpinning
  useEffect(() => {
    if (!isSpinning) {
      hasCompletedRef.current = false
      return
    }

    // Capture the start rotation ONCE at the beginning of the spin
    spinStartRotationRef.current = rotationRef.current

    // Calculate spin target using refs (values captured at spin start)
    // Apply spin direction (1 = clockwise, -1 = counter-clockwise)
    const direction = spinDirectionRef.current
    const spins = minSpinsRef.current + Math.random() * (maxSpinsRef.current - minSpinsRef.current)
    const extraAngle = Math.random() * 2 * Math.PI
    const rotationAmount = (spins * 2 * Math.PI + extraAngle) * direction
    const targetRotation = spinStartRotationRef.current + rotationAmount
    spinTargetRef.current = targetRotation
    spinStartRef.current = null // Will be set on first animation frame
    hasCompletedRef.current = false

    const duration = spinDurationRef.current

    const animate = (time: number) => {
      if (spinStartRef.current === null) {
        spinStartRef.current = time
      }

      const elapsed = time - spinStartRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = wheelEasing(progress)

      // Use the captured start rotation, not the current ref value
      const startRotation = spinStartRotationRef.current
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
          const result = getResultFromRotation(spinTargetRef.current, segmentsRef.current)
          if (result && onSpinCompleteRef.current) {
            onSpinCompleteRef.current(result)
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
  }, [isSpinning]) // Only depend on isSpinning

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
    const outerRadius = size / 2 - 20 // More room for carnival frame
    const innerRadius = outerRadius * config.innerWheelRatio

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Draw carnival outer frame - red and white stripes
    const frameWidth = 18
    const stripeCount = 32
    for (let i = 0; i < stripeCount; i++) {
      const startAngle = (i / stripeCount) * 2 * Math.PI - Math.PI / 2
      const endAngle = ((i + 1) / stripeCount) * 2 * Math.PI - Math.PI / 2

      ctx.beginPath()
      ctx.arc(centerX, centerY, outerRadius + frameWidth, startAngle, endAngle)
      ctx.arc(centerX, centerY, outerRadius + 4, endAngle, startAngle, true)
      ctx.closePath()

      ctx.fillStyle = i % 2 === 0 ? "#DC2626" : "#FEF3C7"
      ctx.fill()
    }

    // Gold ring between frame and wheel
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius + 4, 0, 2 * Math.PI)
    ctx.strokeStyle = "#B8860B"
    ctx.lineWidth = 4
    ctx.stroke()

    // Outer gold ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius + frameWidth, 0, 2 * Math.PI)
    ctx.strokeStyle = "#DAA520"
    ctx.lineWidth = 3
    ctx.stroke()

    // Rotate canvas for wheel rotation
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(currentRotation)
    ctx.translate(-centerX, -centerY)

    // Draw segments with beveled carnival style
    segments.forEach((segment, i) => {
      // Main segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, outerRadius, segment.startAngle - Math.PI / 2, segment.endAngle - Math.PI / 2)
      ctx.closePath()

      // Create gradient for 3D pop effect
      const midAngle = (segment.startAngle + segment.endAngle) / 2 - Math.PI / 2
      const gradient = ctx.createRadialGradient(
        centerX, centerY, innerRadius,
        centerX, centerY, outerRadius
      )

      // Parse hex color and create lighter/darker versions
      const baseColor = segment.color
      gradient.addColorStop(0, baseColor)
      gradient.addColorStop(0.5, baseColor)
      gradient.addColorStop(1, shadeColor(baseColor, -20))

      ctx.fillStyle = gradient
      ctx.fill()

      // White highlight at top of segment for bevel effect
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, outerRadius, segment.startAngle - Math.PI / 2, segment.startAngle - Math.PI / 2 + 0.02)
      ctx.closePath()
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
      ctx.fill()

      // Segment border
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, outerRadius, segment.startAngle - Math.PI / 2, segment.endAngle - Math.PI / 2)
      ctx.closePath()
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw segment content (player or special space)
      const textAngle = midAngle
      const textRadius = outerRadius * 0.82 // Position far towards edge for long names
      const textX = centerX + Math.cos(textAngle) * textRadius
      const textY = centerY + Math.sin(textAngle) * textRadius

      ctx.save()
      ctx.translate(textX, textY)
      ctx.rotate(textAngle + Math.PI / 2)

      if (segment.type === "special") {
        // Draw special space content
        const segmentAngle = segment.endAngle - segment.startAngle
        const arcLength = segmentAngle * outerRadius * 0.5
        const wheelSizeRatio = config.wheelSize / 400
        const textScale = config.textScale ?? 1.0
        
        // Draw emoji/icon
        const emojiSize = Math.round(Math.max(20, Math.min(40, arcLength * 0.5)) * textScale * wheelSizeRatio)
        ctx.font = `${emojiSize}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(segment.info.emoji, 0, -emojiSize * 0.3)
        
        // Draw short name
        const fontSize = Math.round(Math.max(10, Math.min(16, arcLength / 6)) * textScale * wheelSizeRatio)
        ctx.font = `bold ${fontSize}px 'Arial Black', sans-serif`
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)"
        ctx.lineWidth = Math.max(2, fontSize / 5)
        ctx.strokeText(segment.info.shortName, 0, emojiSize * 0.4)
        ctx.fillStyle = segment.info.textColor
        ctx.fillText(segment.info.shortName, 0, emojiSize * 0.4)
      } else if (config.showPlayerNames || config.showPlayerAvatars) {
        // Draw player name/avatar
        const avatarImg = loadedAvatars.get(segment.player.id)
        const hasAvatar = config.showPlayerAvatars && avatarImg

        // Calculate available space based on segment angle
        const segmentAngle = segment.endAngle - segment.startAngle
        const arcLength = segmentAngle * outerRadius * 0.5
        const wheelSizeRatio = config.wheelSize / 400
        const textScale = config.textScale ?? 1.0

        // Draw avatar if available - positioned towards center of segment
        if (hasAvatar) {
          // Responsive avatar size: larger for fewer players
          const baseAvatarSize = config.showPlayerNames
            ? Math.max(20, Math.min(36, arcLength * 0.4)) * textScale * wheelSizeRatio
            : Math.max(28, Math.min(48, arcLength * 0.5)) * textScale * wheelSizeRatio
          const avatarSize = Math.round(baseAvatarSize)
          // Position avatar towards center (positive Y), name at edge (negative Y)
          const avatarY = config.showPlayerNames ? Math.round(avatarSize * 0.6) : 0

          // Draw circular avatar with white border
          ctx.save()
          ctx.beginPath()
          ctx.arc(0, avatarY, avatarSize / 2 + 2, 0, 2 * Math.PI)
          ctx.fillStyle = "white"
          ctx.fill()

          ctx.beginPath()
          ctx.arc(0, avatarY, avatarSize / 2, 0, 2 * Math.PI)
          ctx.closePath()
          ctx.clip()

          ctx.drawImage(
            avatarImg,
            -avatarSize / 2,
            avatarY - avatarSize / 2,
            avatarSize,
            avatarSize
          )
          ctx.restore()
        }

        // Player name with carnival style - positioned at edge of segment
        if (config.showPlayerNames) {
          // Calculate available space based on segment angle and radius
          const arcLengthForText = segmentAngle * outerRadius * 0.8 // More arc space at edge

          // Responsive font size: larger for fewer players, smaller for more
          const baseFontSize = Math.max(11, Math.min(18, 8 + (arcLengthForText / 12))) * textScale * wheelSizeRatio
          const fontSize = Math.round(baseFontSize)

          // Responsive max characters based on space - allow longer names at edge
          const maxChars = Math.max(10, Math.min(20, Math.floor(arcLengthForText / (fontSize * 0.4))))
          const name = segment.player.name.length > maxChars
            ? segment.player.name.slice(0, maxChars - 1) + "…"
            : segment.player.name

          // Text shadow for depth
          ctx.font = `bold ${fontSize}px 'Arial Black', sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          // Position name at edge (negative Y = towards rim), avatar is towards center
          const textYOffset = hasAvatar ? -Math.round(fontSize * 0.8) : 0

          // Black outline - thicker for larger text
          ctx.strokeStyle = "rgba(0, 0, 0, 0.8)"
          ctx.lineWidth = Math.max(2, fontSize / 5)
          ctx.strokeText(name, 0, textYOffset)

          // White fill
          ctx.fillStyle = "white"
          ctx.fillText(name, 0, textYOffset)
        }
      }

      ctx.restore()
    })

    ctx.restore()

    // Draw inner circle (hub) - carnival star burst style
    const hubGradient = ctx.createRadialGradient(
      centerX - 5, centerY - 5, 0,
      centerX, centerY, innerRadius
    )
    hubGradient.addColorStop(0, "#FFD700")
    hubGradient.addColorStop(0.3, "#FFA500")
    hubGradient.addColorStop(0.7, "#DC2626")
    hubGradient.addColorStop(1, "#991B1B")

    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI)
    ctx.fillStyle = hubGradient
    ctx.fill()

    // Draw star burst pattern on hub
    const starPoints = 8
    ctx.save()
    ctx.translate(centerX, centerY)

    for (let i = 0; i < starPoints; i++) {
      const angle = (i / starPoints) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(
        Math.cos(angle - 0.15) * innerRadius * 0.9,
        Math.sin(angle - 0.15) * innerRadius * 0.9
      )
      ctx.lineTo(
        Math.cos(angle) * innerRadius * 0.5,
        Math.sin(angle) * innerRadius * 0.5
      )
      ctx.lineTo(
        Math.cos(angle + 0.15) * innerRadius * 0.9,
        Math.sin(angle + 0.15) * innerRadius * 0.9
      )
      ctx.closePath()
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
      ctx.fill()
    }

    ctx.restore()

    // Hub center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius * 0.4, 0, 2 * Math.PI)
    const centerGradient = ctx.createRadialGradient(
      centerX - 3, centerY - 3, 0,
      centerX, centerY, innerRadius * 0.4
    )
    centerGradient.addColorStop(0, "#FFFFFF")
    centerGradient.addColorStop(0.5, "#FFD700")
    centerGradient.addColorStop(1, "#B8860B")
    ctx.fillStyle = centerGradient
    ctx.fill()

    // Hub border
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI)
    ctx.strokeStyle = "#8B4513"
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius - 2, 0, 2 * Math.PI)
    ctx.strokeStyle = "#DAA520"
    ctx.lineWidth = 2
    ctx.stroke()

  }, [segments, currentRotation, config.wheelSize, config.innerWheelRatio, config.showPlayerNames, config.showPlayerAvatars, config.textScale, loadedAvatars])

  // Helper function to shade colors
  function shadeColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return "#" + (0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1)
  }

  const bulbCount = 20
  const frameOffset = 18 // Match the frame width

  return (
    <div className={cn("relative inline-block pt-14", className)}>
      {/* String for bunting */}
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
        style={{ width: config.wheelSize * 0.85, height: 24 }}
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 2 Q 50 22 100 2"
          fill="none"
          stroke="#8B4513"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Bunting/Pennants at top - positioned along the cord curve */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        style={{ width: config.wheelSize * 0.85, height: 50 }}
      >
        {Array.from({ length: 13 }).map((_, i) => {
          const colors = ["#DC2626", "#FFD700", "#2563EB", "#16A34A", "#9333EA"]
          const totalFlags = 13
          const xPercent = ((i / (totalFlags - 1)) * 100)
          // Match the quadratic bezier curve: M 0 2 Q 50 22 100 2
          // Bezier formula: B(t) = (1-t)²*P0 + 2*(1-t)*t*P1 + t²*P2
          // where P0=(0,2), P1=(50,22), P2=(100,2)
          const t = i / (totalFlags - 1)
          const yOffset = (1-t)*(1-t)*2 + 2*(1-t)*t*22 + t*t*2

          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${xPercent}%`,
                top: yOffset,
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: `18px solid ${colors[i % colors.length]}`,
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))",
              }}
            />
          )
        })}
      </div>

      {/* Wheel */}
      <canvas
        ref={canvasRef}
        className={cn(
          "rounded-full",
          isSpinning && "drop-shadow-[0_0_40px_rgba(255,200,100,0.6)]"
        )}
        style={{
          width: config.wheelSize,
          height: config.wheelSize,
        }}
      />

      {/* Carnival Pointer/Arrow at top */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{
          top: 48, // Account for pt-14 (56px) minus pointer overlap
          filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))"
        }}
      >
        <svg width="50" height="60" viewBox="0 0 50 60">
          <defs>
            <linearGradient id="carnivalPointerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="30%" stopColor="#FFEC8B" />
              <stop offset="70%" stopColor="#DAA520" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <linearGradient id="pointerHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {/* Main pointer body */}
          <path
            d="M25 60 L8 15 Q8 2 25 2 Q42 2 42 15 L25 60"
            fill="url(#carnivalPointerGradient)"
            stroke="#8B4513"
            strokeWidth="2"
          />
          {/* Highlight */}
          <path
            d="M25 55 L12 18 Q12 8 25 8"
            fill="none"
            stroke="url(#pointerHighlight)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Decorative circles */}
          <circle cx="25" cy="12" r="6" fill="#DC2626" stroke="#8B4513" strokeWidth="1.5" />
          <circle cx="25" cy="12" r="3" fill="#FFD700" />
        </svg>
      </div>

      {/* Carnival Marquee Light bulbs around the rim */}
      <div className="absolute inset-0 top-14 pointer-events-none">
        {Array.from({ length: bulbCount }).map((_, i) => {
          const angle = (i / bulbCount) * 2 * Math.PI - Math.PI / 2
          const radius = config.wheelSize / 2 + frameOffset
          const x = config.wheelSize / 2 + Math.cos(angle) * radius
          const y = config.wheelSize / 2 + Math.sin(angle) * radius

          // Chase pattern when spinning, alternating when idle
          const bulbColor = BULB_COLORS[i % BULB_COLORS.length]
          const isLit = isSpinning
            ? (bulbFrame + i) % 3 === 0  // Chase pattern
            : i % 2 === (bulbFrame % 2)   // Alternating pattern

          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all"
              style={{
                left: x,
                top: y,
                transitionDuration: isSpinning ? "50ms" : "300ms",
              }}
            >
              {/* Bulb socket */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{ backgroundColor: "#4A4A4A" }}
              />
              {/* Bulb */}
              <div
                className="w-4 h-4 rounded-full relative"
                style={{
                  backgroundColor: isLit ? bulbColor.on : bulbColor.off,
                  boxShadow: isLit
                    ? `0 0 12px 4px ${bulbColor.glow}, inset 0 -2px 4px rgba(0,0,0,0.3)`
                    : "inset 0 -2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {/* Highlight */}
                {isLit && (
                  <div
                    className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sparkle effects when spinning */}
      {isSpinning && (
        <div className="absolute inset-0 top-14 pointer-events-none overflow-hidden rounded-full">
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = ((bulbFrame * 0.1 + i * 60) % 360) * (Math.PI / 180)
            const radius = config.wheelSize * 0.35
            const x = config.wheelSize / 2 + Math.cos(angle) * radius
            const y = config.wheelSize / 2 + Math.sin(angle) * radius

            return (
              <div
                key={i}
                className="absolute w-2 h-2"
                style={{
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%) rotate(45deg)",
                  background: "white",
                  boxShadow: "0 0 10px 2px rgba(255,255,255,0.8)",
                  opacity: 0.7 + Math.sin(bulbFrame * 0.3 + i) * 0.3,
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
