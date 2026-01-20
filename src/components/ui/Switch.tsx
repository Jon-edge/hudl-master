"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <label className={cn("inline-flex items-center cursor-pointer", className)}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={event => onCheckedChange(event.target.checked)}
        {...props}
      />
      <span
        className={cn(
          "relative h-5 w-9 rounded-full border border-slate-200 bg-slate-200 transition peer-checked:border-sky-400 peer-checked:bg-sky-500",
          "after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition after:content-['']",
          "peer-checked:after:translate-x-4"
        )}
      />
    </label>
  )
}
