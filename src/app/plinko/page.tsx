"use client"

import { Plinko } from "@/components/game/Plinko"

export default function PlinkoPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Plinko</h1>
      <Plinko />
    </div>
  )
}
