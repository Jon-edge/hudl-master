export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  ttl: number
  size: number
  color: string
}

export const createBurst = (x: number, y: number, color: string, count = 14): Particle[] => {
  const particles: Particle[] = []
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = 20 + Math.random() * 60
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0,
      ttl: 700 + Math.random() * 500,
      size: 2 + Math.random() * 3,
      color
    })
  }
  return particles
}

export const updateParticles = (particles: Particle[], deltaMs: number) => {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i]
    particle.life += deltaMs
    if (particle.life >= particle.ttl) {
      particles.splice(i, 1)
      continue
    }
    const dt = deltaMs / 1000
    particle.vy += 180 * dt
    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
  }
}
