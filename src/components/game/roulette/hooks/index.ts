// Use the new polar coordinate physics for realistic roulette simulation
export { useRoulettePhysics } from "./useRoulettePhysicsPolar"
export type { BallState, UseRoulettePhysicsOptions, UseRoulettePhysicsReturn } from "./useRoulettePhysicsPolar"

// Keep old physics available for reference/comparison
export { useRoulettePhysics as useRoulettePhysicsMatter } from "./useRoulettePhysicsMatter"
export { useRoulettePhysics as useRoulettePhysicsLegacy } from "./useRoulettePhysics"

