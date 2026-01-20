import * as React from "react"
import { cn } from "@/lib/utils"

interface GameLayoutProps {
  children: React.ReactNode
  leftSidebar?: React.ReactNode
  rightSidebar?: React.ReactNode
  className?: string
}

export function GameLayout({
  children,
  leftSidebar,
  rightSidebar,
  className,
}: GameLayoutProps) {
  return (
    <div className={cn("flex h-screen w-screen overflow-hidden bg-background text-foreground", className)}>
      {/* Left Sidebar - Desktop */}
      {leftSidebar && (
        <aside className="hidden lg:flex w-64 xl:w-72 flex-col border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl shrink-0 z-10">
          {leftSidebar}
        </aside>
      )}

      {/* Main Content (Game Board) */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 lg:p-6 overflow-hidden">
           {children}
        </div>
      </main>

      {/* Right Sidebar - Desktop */}
      {rightSidebar && (
        <aside className="hidden lg:flex flex-col border-l border-sidebar-border bg-sidebar/50 backdrop-blur-xl shrink-0 z-10 transition-all duration-300 ease-in-out">
          {rightSidebar}
        </aside>
      )}
    </div>
  )
}
