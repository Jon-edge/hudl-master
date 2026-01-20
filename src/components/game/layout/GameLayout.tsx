"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface GameLayoutProps {
  children?: React.ReactNode
  className?: string
  /** Content for the left sidebar (e.g., player roster) */
  leftSidebar?: React.ReactNode
  /** Content for the main game area */
  mainContent?: React.ReactNode
  /** Content for the right sidebar (e.g., leaderboard/config) */
  rightSidebar?: React.ReactNode
  /** Whether the left sidebar is open on mobile */
  leftSidebarOpen?: boolean
  /** Whether the right sidebar is open on mobile */
  rightSidebarOpen?: boolean
  /** Callback when left sidebar toggle is clicked */
  onLeftSidebarToggle?: () => void
  /** Callback when right sidebar toggle is clicked */
  onRightSidebarToggle?: () => void
}

/**
 * GameLayout - A responsive 3-pane layout for games
 * 
 * Desktop: Three-pane horizontal layout (Players | Board | Leaderboard/Config)
 * Mobile: Vertical stack with sidebars as slide-out drawers
 */
export function GameLayout({
  className,
  leftSidebar,
  mainContent,
  rightSidebar,
  leftSidebarOpen = false,
  rightSidebarOpen = false,
  onLeftSidebarToggle,
  onRightSidebarToggle,
}: GameLayoutProps) {
  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* Background with subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/30 -z-10" />
      
      {/* Main layout container */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6 p-4 lg:p-6 max-w-[1800px] mx-auto">
        
        {/* Left Sidebar - Desktop: always visible, Mobile: slide-out drawer */}
        <aside 
          className={cn(
            // Base styles
            "glass-panel rounded-xl overflow-hidden transition-all duration-300 ease-out",
            // Desktop styles
            "lg:relative lg:translate-x-0 lg:w-64 lg:min-w-64 lg:shrink-0",
            // Mobile styles - slide from left
            "fixed lg:static inset-y-0 left-0 z-40 w-72 max-w-[85vw]",
            leftSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="h-full max-h-[calc(100vh-2rem)] lg:max-h-[80vh] overflow-y-auto scrollbar-glass p-4">
            {leftSidebar}
          </div>
        </aside>

        {/* Main Content Area - Game Board */}
        <main className="flex-1 flex flex-col items-center gap-4 min-w-0">
          <div className="glass-panel-elevated rounded-2xl p-4 lg:p-6 w-full max-w-fit">
            {mainContent}
          </div>
        </main>

        {/* Right Sidebar - Desktop: always visible, Mobile: slide-out drawer */}
        <aside 
          className={cn(
            // Base styles
            "glass-panel rounded-xl overflow-hidden transition-all duration-300 ease-out",
            // Desktop styles
            "lg:relative lg:translate-x-0 lg:w-80 lg:min-w-80 lg:shrink-0",
            // Mobile styles - slide from right
            "fixed lg:static inset-y-0 right-0 z-40 w-80 max-w-[85vw]",
            rightSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          <div className="h-full max-h-[calc(100vh-2rem)] lg:max-h-[80vh] overflow-y-auto scrollbar-glass p-4">
            {rightSidebar}
          </div>
        </aside>
      </div>

      {/* Mobile overlay backdrop */}
      {(leftSidebarOpen || rightSidebarOpen) && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => {
            if (leftSidebarOpen && onLeftSidebarToggle) onLeftSidebarToggle()
            if (rightSidebarOpen && onRightSidebarToggle) onRightSidebarToggle()
          }}
        />
      )}
    </div>
  )
}

/**
 * Mobile toggle button for sidebars
 */
export function SidebarToggle({
  side,
  isOpen,
  onClick,
  icon,
  label,
  className,
}: {
  side: "left" | "right"
  isOpen: boolean
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "lg:hidden fixed z-50 p-3 rounded-full glass-panel shadow-lg",
        "transition-all duration-200 hover:scale-105 active:scale-95",
        side === "left" ? "left-4 bottom-20" : "right-4 bottom-20",
        isOpen && "opacity-0 pointer-events-none",
        className
      )}
      aria-label={label || `Toggle ${side} sidebar`}
    >
      {icon || (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {side === "left" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
          )}
        </svg>
      )}
    </button>
  )
}
