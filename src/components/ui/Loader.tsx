"use client"

export interface LoaderProps {
  label?: string
  className?: string  
}

/**
 * Loader component for indicating loading states
 */
export function Loader({ label, className }: LoaderProps) {
  return (
    <div className={className}>
      <div className=""></div>
      {label!= null && <span className="ml-2">{label}</span>}
    </div>
  )
}
