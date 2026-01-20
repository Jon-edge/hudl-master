import { useEffect, useRef } from "react"
import Matter, { Engine, Composite } from "matter-js"
import { PlinkoConfig } from "../types"
import { particleSystem } from "../utils/particles"

interface UsePlinkoRenderProps {
  engine: Matter.Engine | null
  canvasRef: React.RefObject<HTMLDivElement>
  config: PlinkoConfig
}

export function usePlinkoRender({ engine, canvasRef, config }: UsePlinkoRenderProps) {
  const requestRef = useRef<number>()
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!engine || !canvasRef.current) return

    // Setup Canvas
    const container = canvasRef.current
    let canvas = canvasElRef.current
    
    if (!canvas) {
      canvas = document.createElement("canvas")
      container.appendChild(canvas)
      canvasElRef.current = canvas
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const renderLoop = () => {
      if (!engine || !canvas) return

      // Handle Resize
      if (canvas.width !== config.width || canvas.height !== config.height) {
        canvas.width = config.width
        canvas.height = config.height
        // Handle High DPI
        const dpr = window.devicePixelRatio || 1
        canvas.style.width = `${config.width}px`
        canvas.style.height = `${config.height}px`
        canvas.width = config.width * dpr
        canvas.height = config.height * dpr
        ctx.scale(dpr, dpr)
      }

      // Clear
      ctx.clearRect(0, 0, config.width, config.height)
      
      // Update & Draw Particles
      particleSystem.update()
      particleSystem.draw(ctx)

      const bodies = Composite.allBodies(engine.world)

      ctx.save()
      
      // Draw Bodies
      bodies.forEach(body => {
        if (body.render.visible === false) return

        ctx.beginPath()
        const vertices = body.vertices
        ctx.moveTo(vertices[0].x, vertices[0].y)
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y)
        }
        ctx.lineTo(vertices[0].x, vertices[0].y)
        ctx.closePath()

        // Style based on body type/label
        // Pins
        if (body.isStatic && body.label !== "Rectangle Body") { 
           // Note: Matter default label is 'Circle Body' etc.
           // We might need better identification in physics hook.
           // For now, assume small circles are pins.
           // Actually, physics hook sets render.fillStyle.
        }

        if (body.render.fillStyle) {
          ctx.fillStyle = body.render.fillStyle
        } else {
          ctx.fillStyle = "#000"
        }
        
        // Add Shadow/Glow for balls
        if (!body.isStatic) {
          ctx.shadowColor = "rgba(59, 130, 246, 0.5)"
          ctx.shadowBlur = 10
        } else {
          ctx.shadowColor = "transparent"
          ctx.shadowBlur = 0
        }

        ctx.fill()
        
        // Stroke
        if (body.render.strokeStyle) {
          ctx.lineWidth = body.render.lineWidth || 1
          ctx.strokeStyle = body.render.strokeStyle
          ctx.stroke()
        }
      })

      ctx.restore()

      requestRef.current = requestAnimationFrame(renderLoop)
    }

    requestRef.current = requestAnimationFrame(renderLoop)

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      if (canvas && container.contains(canvas)) {
        // container.removeChild(canvas) // Optional: keep canvas to prevent flicker? 
        // Better to remove on unmount.
        container.removeChild(canvas)
        canvasElRef.current = null
      }
    }
  }, [engine, config]) // Re-run if engine or config changes
}
