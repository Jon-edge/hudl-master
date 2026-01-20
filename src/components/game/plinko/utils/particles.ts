"use client"

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  decay: number
  gravity: number
}

export interface ParticleEmitter {
  particles: Particle[]
  addBurst: (x: number, y: number, count: number, options?: Partial<ParticleOptions>) => void
  addStream: (x: number, y: number, options?: Partial<ParticleOptions>) => void
  update: () => void
  draw: (ctx: CanvasRenderingContext2D) => void
  clear: () => void
}

interface ParticleOptions {
  minSize: number
  maxSize: number
  minSpeed: number
  maxSpeed: number
  colors: string[]
  gravity: number
  decay: number
  spread: number
}

const defaultOptions: ParticleOptions = {
  minSize: 2,
  maxSize: 6,
  minSpeed: 2,
  maxSpeed: 8,
  colors: ["#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"],
  gravity: 0.15,
  decay: 0.02,
  spread: Math.PI * 2,
}

/**
 * Create a particle emitter for visual effects
 */
export function createParticleEmitter(): ParticleEmitter {
  const particles: Particle[] = []

  const createParticle = (
    x: number,
    y: number,
    angle: number,
    options: ParticleOptions
  ): Particle => {
    const speed = options.minSpeed + Math.random() * (options.maxSpeed - options.minSpeed)
    const size = options.minSize + Math.random() * (options.maxSize - options.minSize)
    const color = options.colors[Math.floor(Math.random() * options.colors.length)]

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color,
      alpha: 1,
      decay: options.decay + Math.random() * 0.01,
      gravity: options.gravity,
    }
  }

  const addBurst = (
    x: number,
    y: number,
    count: number,
    options: Partial<ParticleOptions> = {}
  ) => {
    const opts = { ...defaultOptions, ...options }
    const angleStep = opts.spread / count
    const startAngle = -opts.spread / 2

    for (let i = 0; i < count; i++) {
      const angle = startAngle + angleStep * i + (Math.random() - 0.5) * angleStep * 0.5
      particles.push(createParticle(x, y, angle, opts))
    }
  }

  const addStream = (
    x: number,
    y: number,
    options: Partial<ParticleOptions> = {}
  ) => {
    const opts = { ...defaultOptions, ...options }
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * opts.spread
    particles.push(createParticle(x, y, angle, opts))
  }

  const update = () => {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.alpha -= p.decay
      
      // Slow down over time
      p.vx *= 0.98
      p.vy *= 0.98

      // Remove dead particles
      if (p.alpha <= 0) {
        particles.splice(i, 1)
      }
    }
  }

  const draw = (ctx: CanvasRenderingContext2D) => {
    particles.forEach(p => {
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }

  const clear = () => {
    particles.length = 0
  }

  return {
    particles,
    addBurst,
    addStream,
    update,
    draw,
    clear,
  }
}

/**
 * Preset particle effects
 */
export const particlePresets = {
  collision: {
    minSize: 1,
    maxSize: 3,
    minSpeed: 1,
    maxSpeed: 4,
    colors: ["#6366f1", "#818cf8", "#a5b4fc"],
    gravity: 0.05,
    decay: 0.04,
    spread: Math.PI * 2,
  },
  bucket: {
    minSize: 2,
    maxSize: 5,
    minSpeed: 2,
    maxSpeed: 6,
    colors: ["#22c55e", "#4ade80", "#86efac"],
    gravity: 0.1,
    decay: 0.025,
    spread: Math.PI,
  },
  win: {
    minSize: 3,
    maxSize: 8,
    minSpeed: 4,
    maxSpeed: 12,
    colors: ["#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"],
    gravity: 0.2,
    decay: 0.015,
    spread: Math.PI * 2,
  },
  confetti: {
    minSize: 4,
    maxSize: 10,
    minSpeed: 3,
    maxSpeed: 10,
    colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"],
    gravity: 0.12,
    decay: 0.008,
    spread: Math.PI,
  },
}
