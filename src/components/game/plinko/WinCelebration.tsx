"use client"

import { useEffect, useRef } from "react"
import Matter, { Bodies, Composite, Engine, Runner } from "matter-js"
import { Button } from "@/components/ui/button"

interface WinCelebrationProps {
  open: boolean
  winnerName: string
  winnerAvatarUrl: string
  onClose: () => void
}

export function WinCelebration({
  open,
  winnerName,
  winnerAvatarUrl,
  onClose
}: WinCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const avatarImageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current
    if (canvas == null) return
    const ctx = canvas.getContext("2d")
    if (ctx == null) return

    const width = 700
    const height = 420
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    const engine = Engine.create()
    const runner = Runner.create()
    const world = engine.world

    const walls = [
      Bodies.rectangle(width / 2, -20, width, 40, { isStatic: true }),
      Bodies.rectangle(width / 2, height + 20, width, 40, { isStatic: true }),
      Bodies.rectangle(-20, height / 2, 40, height, { isStatic: true }),
      Bodies.rectangle(width + 20, height / 2, 40, height, { isStatic: true })
    ]
    Composite.add(world, walls)

    const avatarRadius = 60
    const avatarBody = Bodies.circle(width / 2, height / 2 - 30, avatarRadius, {
      isStatic: true
    })
    const nameWidth = Math.max(240, winnerName.length * 14)
    const nameBody = Bodies.rectangle(width / 2, height / 2 + 70, nameWidth, 36, {
      isStatic: true
    })
    Composite.add(world, [avatarBody, nameBody])

    avatarImageRef.current = new Image()
    avatarImageRef.current.src = winnerAvatarUrl

    let dropInterval: ReturnType<typeof setInterval> | null = null
    dropInterval = setInterval(() => {
      const ball = Bodies.circle(Math.random() * width, -20, 10, {
        restitution: 0.9,
        friction: 0.02
      })
      Composite.add(world, ball)
    }, 120)

    Runner.run(runner, engine)

    let animationFrame = 0
    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = "rgba(15,23,42,0.85)"
      ctx.fillRect(0, 0, width, height)

      const avatarImage = avatarImageRef.current
      if (avatarImage != null && avatarImage.complete) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarBody.position.x, avatarBody.position.y, avatarRadius, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(
          avatarImage,
          avatarBody.position.x - avatarRadius,
          avatarBody.position.y - avatarRadius,
          avatarRadius * 2,
          avatarRadius * 2
        )
        ctx.restore()
      } else {
        ctx.fillStyle = "rgba(148,163,184,0.8)"
        ctx.beginPath()
        ctx.arc(avatarBody.position.x, avatarBody.position.y, avatarRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = "rgba(255,255,255,0.95)"
      ctx.textAlign = "center"
      ctx.font = "24px system-ui, -apple-system, sans-serif"
      ctx.fillText(winnerName, nameBody.position.x, nameBody.position.y + 8)

      ctx.fillStyle = "rgba(226,232,240,0.9)"
      const bodies = Composite.allBodies(world).filter(body => !body.isStatic)
      bodies.forEach(body => {
        if (body.circleRadius == null) return
        ctx.beginPath()
        ctx.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrame = requestAnimationFrame(renderFrame)
    }

    animationFrame = requestAnimationFrame(renderFrame)

    return () => {
      if (dropInterval != null) clearInterval(dropInterval)
      cancelAnimationFrame(animationFrame)
      Runner.stop(runner)
      Engine.clear(engine)
    }
  }, [open, winnerAvatarUrl, winnerName])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative flex flex-col items-center gap-4 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
        <canvas ref={canvasRef} />
        <div className="flex items-center justify-between gap-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-200">Round Winner</p>
            <p className="text-lg font-semibold">{winnerName}</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
