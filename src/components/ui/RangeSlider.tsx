"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface RangeSliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number
  onValueChange: (value: number) => void
  min: number
  max: number
}

export function RangeSlider({ className, value, onValueChange, min, max, ...props }: RangeSliderProps) {
  return (
    <input
      type="range"
      className={cn("w-full h-2", className)}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      min={min}
      max={max}
      {...props}
    />
  )
}

