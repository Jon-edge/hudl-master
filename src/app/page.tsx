"use client"

import { Plinko } from "@/components/game/Plinko"

export default function Home() {
  return (
    <div className="min-h-screen pt-8 px-8">
      <h1 className="text-xl font-bold mb-4 text-center">Plinko</h1>
      <Plinko />
    </div>
  )
}
