"use client"

import * as React from "react"
import { motion } from "framer-motion"
import Matter, { Engine, Render, Runner, Bodies, Composite } from "matter-js"
import { X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { PlayerProfile } from "../shared/types"
import { getAvatarUrl } from "../shared/api"

interface WinCelebrationProps {
  winner: PlayerProfile
  onClose: () => void
}

export function WinCelebration({ winner, onClose }: WinCelebrationProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const sceneRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    if (!sceneRef.current || !containerRef.current || !cardRef.current) return

    const engine = Engine.create()
    const runner = Runner.create()
    
    // Bounds
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width,
        height,
        background: "transparent",
        wireframes: false,
        pixelRatio: window.devicePixelRatio
      }
    })

    // Get card bounds relative to container
    const cardRect = cardRef.current.getBoundingClientRect()
    // Need to center it in the physics world which matches the container
    // Assuming overlay is fixed inset-0, coordinates match window
    // But Render is in sceneRef which is also absolute inset-0.
    // So ClientRect should work if we offset by container pos (usually 0,0)
    
    const cx = cardRect.left + cardRect.width / 2
    const cy = cardRect.top + cardRect.height / 2
    
    // Add Card Body (Static Obstacle)
    const cardBody = Bodies.rectangle(cx, cy, cardRect.width, cardRect.height, {
      isStatic: true,
      render: { visible: false } // Invisible, matches DOM element
    })
    
    // Walls
    const walls = [
      Bodies.rectangle(width/2, height + 50, width, 100, { isStatic: true, render: { visible: false } }), // Floor
      Bodies.rectangle(-25, height/2, 50, height, { isStatic: true, render: { visible: false } }), // Left
      Bodies.rectangle(width+25, height/2, 50, height, { isStatic: true, render: { visible: false } }), // Right
    ]

    Composite.add(engine.world, [cardBody, ...walls])

    // Spawner
    let ballCount = 0
    const interval = setInterval(() => {
      if (ballCount > 100) return
      
      const x = Math.random() * width
      const size = 10 + Math.random() * 20
      const ball = Bodies.circle(x, -50, size, {
        restitution: 0.8,
        friction: 0.005,
        render: {
          fillStyle: `hsl(${Math.random() * 360}, 70%, 50%)`
        }
      })
      Composite.add(engine.world, ball)
      ballCount++
    }, 100)

    Render.run(render)
    Runner.run(runner, engine)

    return () => {
      clearInterval(interval)
      Render.stop(render)
      Runner.stop(runner)
      Engine.clear(engine)
      if (render.canvas.parentNode) render.canvas.parentNode.removeChild(render.canvas)
    }
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div ref={sceneRef} className="absolute inset-0 pointer-events-none" />
      
      <motion.div 
        ref={cardRef}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 bg-background border p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm"
      >
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-primary">WINNER!</h2>
          <p className="text-muted-foreground">Round Winner</p>
        </div>

        <div className="relative h-32 w-32 rounded-full border-4 border-primary p-1">
          <div className="relative h-full w-full rounded-full overflow-hidden">
            <Image
              src={getAvatarUrl(winner)}
              alt={winner.name}
              fill
              className="object-cover"
            />
          </div>
        </div>

        <h1 className="text-4xl font-extrabold">{winner.name}</h1>
        
        <Button size="lg" onClick={onClose} className="w-full">
          New Round
        </Button>
      </motion.div>
    </div>
  )
}
