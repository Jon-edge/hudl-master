"use client"

import { Plinko } from "@/components/game/Plinko"

export default function PlinkoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center pt-8">
      <h1 className="text-xl font-bold mb-4">Plinko</h1>
      <Plinko />
    </div>
  )
}
