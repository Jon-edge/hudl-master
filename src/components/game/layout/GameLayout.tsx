"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
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
  /** Force right sidebar to be pinned open (e.g., when settings is active) */
  forceRightPinned?: boolean
}

// How close to edge triggers expand (px)
const HOVER_ZONE_WIDTH = 350
// Delay before sidebar collapses after mouse leaves (ms)
const HOVER_COLLAPSE_DELAY = 100

/**
 * GameLayout - A responsive 3-pane layout for games
 * 
 * Desktop: Board is always centered, sidebars are overlays that slide in/out
 * Mobile: Vertical stack with sidebars as slide-out drawers
 * 
 * Sidebars have two modes:
 * - Pinned (default): Always visible, stays open
 * - Auto-hide: Hides when mouse leaves, shows on hover near edge
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
  forceRightPinned,
}: GameLayoutProps) {
  // Whether sidebars are in "auto-hide" mode (pinned = false means auto-hide)
  const [leftPinned, setLeftPinned] = useState(true)
  const [rightPinned, setRightPinned] = useState(true)
  
  // Current visibility (for auto-hide mode)
  const [leftVisible, setLeftVisible] = useState(true)
  const [rightVisible, setRightVisible] = useState(true)
  
  // Track if mouse must leave hover zone before hover-to-expand works again
  // (prevents instant re-open when clicking "Hide" with mouse still in zone)
  const leftMustLeaveRef = useRef(false)
  const rightMustLeaveRef = useRef(false)
  
  // When forceRightPinned becomes true, pin the right sidebar
  useEffect(() => {
    if (forceRightPinned) {
      setRightPinned(true)
      setRightVisible(true)
    }
  }, [forceRightPinned])
  
  // Refs for collapse timers (small delay so sidebar doesn't flicker on accidental mouse-out)
  const leftCollapseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const rightCollapseTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track if we're on desktop (lg breakpoint = 1024px)
  const [isDesktop, setIsDesktop] = useState(false)
  
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener("resize", checkDesktop)
    return () => window.removeEventListener("resize", checkDesktop)
  }, [])
  
  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      if (leftCollapseTimerRef.current) clearTimeout(leftCollapseTimerRef.current)
      if (rightCollapseTimerRef.current) clearTimeout(rightCollapseTimerRef.current)
    }
  }, [])
  
  // Determine if sidebar should be shown
  const leftShown = leftPinned || leftVisible
  const rightShown = rightPinned || rightVisible
  
  // Handle mouse movement for hover-to-expand when sidebars are in auto-hide mode and hidden
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDesktop) return
    
    const { clientX } = e
    const windowWidth = window.innerWidth
    
    // Left edge hover detection - only when in auto-hide mode and hidden
    if (!leftPinned && !leftVisible && clientX <= HOVER_ZONE_WIDTH) {
      if (leftCollapseTimerRef.current) {
        clearTimeout(leftCollapseTimerRef.current)
        leftCollapseTimerRef.current = null
      }
      // Only allow hover-to-expand if mouse has left the zone since hiding
      if (!leftMustLeaveRef.current) {
        setLeftVisible(true)
      }
    } else if (!leftPinned && !leftVisible) {
      // Mouse moved away from hover zone - allow hover-to-expand again
      leftMustLeaveRef.current = false
    }
    
    // Right edge hover detection - only when in auto-hide mode and hidden
    if (!rightPinned && !rightVisible && clientX >= windowWidth - HOVER_ZONE_WIDTH) {
      if (rightCollapseTimerRef.current) {
        clearTimeout(rightCollapseTimerRef.current)
        rightCollapseTimerRef.current = null
      }
      // Only allow hover-to-expand if mouse has left the zone since hiding
      if (!rightMustLeaveRef.current) {
        setRightVisible(true)
      }
    } else if (!rightPinned && !rightVisible) {
      // Mouse moved away from hover zone - allow hover-to-expand again
      rightMustLeaveRef.current = false
    }
  }, [isDesktop, leftPinned, leftVisible, rightPinned, rightVisible])
  
  // Attach mouse move listener when sidebars are in auto-hide mode and hidden
  useEffect(() => {
    if (isDesktop && ((!leftPinned && !leftVisible) || (!rightPinned && !rightVisible))) {
      window.addEventListener("mousemove", handleMouseMove)
      return () => window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [isDesktop, leftPinned, leftVisible, rightPinned, rightVisible, handleMouseMove])

  // Handle mouse leaving sidebar area - only collapse if in auto-hide mode
  const handleLeftMouseLeave = useCallback(() => {
    if (!isDesktop || leftPinned) return
    leftCollapseTimerRef.current = setTimeout(() => {
      setLeftVisible(false)
      leftCollapseTimerRef.current = null
    }, HOVER_COLLAPSE_DELAY)
  }, [isDesktop, leftPinned])
  
  const handleLeftMouseEnter = useCallback(() => {
    if (leftCollapseTimerRef.current) {
      clearTimeout(leftCollapseTimerRef.current)
      leftCollapseTimerRef.current = null
    }
  }, [])
  
  const handleRightMouseLeave = useCallback(() => {
    if (!isDesktop || rightPinned) return
    rightCollapseTimerRef.current = setTimeout(() => {
      setRightVisible(false)
      rightCollapseTimerRef.current = null
    }, HOVER_COLLAPSE_DELAY)
  }, [isDesktop, rightPinned])
  
  const handleRightMouseEnter = useCallback(() => {
    if (rightCollapseTimerRef.current) {
      clearTimeout(rightCollapseTimerRef.current)
      rightCollapseTimerRef.current = null
    }
  }, [])
  
  // Toggle pin state
  const toggleLeftPin = useCallback(() => {
    if (leftPinned) {
      // Switching to auto-hide mode - immediately hide
      setLeftPinned(false)
      setLeftVisible(false)
      // Require mouse to leave hover zone before hover-to-expand works
      leftMustLeaveRef.current = true
    } else {
      // Switching to pinned mode - show and keep visible
      setLeftPinned(true)
      setLeftVisible(true)
    }
  }, [leftPinned])
  
  const toggleRightPin = useCallback(() => {
    if (rightPinned) {
      // Switching to auto-hide mode - immediately hide
      setRightPinned(false)
      setRightVisible(false)
      // Require mouse to leave hover zone before hover-to-expand works
      rightMustLeaveRef.current = true
    } else {
      // Switching to pinned mode - show and keep visible
      setRightPinned(true)
      setRightVisible(true)
    }
  }, [rightPinned])

  return (
    <div className={cn("relative min-h-screen overflow-x-hidden", className)}>
      {/* Background with subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/30 -z-10" />
      
      {/* Main Content - Always centered, full width */}
      <main className="flex flex-col items-center gap-4 p-4 lg:p-6 min-h-screen">
        <div className="glass-panel-elevated rounded-2xl p-4 lg:p-6 w-full max-w-fit">
          {mainContent}
        </div>
      </main>
      
      {/* Left Sidebar - Fixed overlay on desktop */}
      <aside 
        className={cn(
          // Base styles
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw]",
          "glass-panel overflow-hidden transition-transform duration-300 ease-out",
          // Desktop: slide in/out as overlay
          "lg:w-64 lg:top-4 lg:bottom-4 lg:left-4 lg:rounded-xl lg:shadow-xl",
          // Visibility
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full",
          isDesktop && leftShown && "lg:translate-x-0",
          isDesktop && !leftShown && "lg:-translate-x-[calc(100%+1rem)]"
        )}
        onMouseEnter={handleLeftMouseEnter}
        onMouseLeave={handleLeftMouseLeave}
      >
        <div className="h-full max-h-screen lg:max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-glass p-4 pb-16 lg:pb-16">
          {leftSidebar}
        </div>
        
        {/* Pin/Auto-hide toggle button - at bottom of sidebar */}
        <div className="hidden lg:block absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/80 to-transparent">
          <button
            onClick={toggleLeftPin}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md",
              "text-sm font-medium transition-all",
              "outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              leftPinned 
                ? "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50" 
                : "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80"
            )}
            aria-label={leftPinned ? "Hide panel" : "Pin panel"}
          >
            {/* Sidebar collapse icon */}
            <svg 
              className="w-4 h-4" 
              fill="none"
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {leftPinned ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              )}
            </svg>
            <span>{leftPinned ? "Hide Panel" : "Pin Panel"}</span>
          </button>
        </div>
      </aside>

      {/* Right Sidebar - Fixed overlay on desktop */}
        <aside 
          className={cn(
            // Base styles
          "fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw]",
          "glass-panel overflow-hidden transition-transform duration-300 ease-out",
          // Desktop: slide in/out as overlay
          "lg:w-80 lg:top-4 lg:bottom-4 lg:right-4 lg:rounded-xl lg:shadow-xl",
          // Visibility
          rightSidebarOpen ? "translate-x-0" : "translate-x-full",
          isDesktop && rightShown && "lg:translate-x-0",
          isDesktop && !rightShown && "lg:translate-x-[calc(100%+1rem)]"
        )}
        onMouseEnter={handleRightMouseEnter}
        onMouseLeave={handleRightMouseLeave}
      >
        <div className="h-full max-h-screen lg:max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-glass p-4 pb-16 lg:pb-16">
          {rightSidebar}
        </div>
        
        {/* Pin/Auto-hide toggle button - at bottom of sidebar */}
        <div className="hidden lg:block absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/80 to-transparent">
          <button
            onClick={toggleRightPin}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md",
              "text-sm font-medium transition-all",
              "outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              rightPinned 
                ? "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50" 
                : "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80"
            )}
            aria-label={rightPinned ? "Hide panel" : "Pin panel"}
          >
            {/* Sidebar collapse icon */}
            <svg 
              className="w-4 h-4" 
              fill="none"
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {rightPinned ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              )}
            </svg>
            <span>{rightPinned ? "Hide Panel" : "Pin Panel"}</span>
          </button>
          </div>
        </aside>

      {/* Expand buttons when sidebars are hidden (desktop only, auto-hide mode) */}
      {isDesktop && !leftShown && (
        <button 
          className={cn(
            "fixed left-0 top-28 z-30",
            "flex items-center gap-2 pl-0 pr-3 py-3",
            "bg-muted/95 hover:bg-muted border border-border/50 border-l-0",
            "rounded-r-xl shadow-lg",
            "text-muted-foreground hover:text-foreground",
            "transition-all duration-200 hover:pl-1"
          )}
          onClick={() => setLeftVisible(true)}
          aria-label="Show players sidebar"
        >
          <div className="w-1 h-8 bg-primary/60 rounded-full ml-1" />
          <div className="flex flex-col items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider">Players</span>
          </div>
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      
      {isDesktop && !rightShown && (
        <button 
          className={cn(
            "fixed right-0 top-28 z-30",
            "flex items-center gap-2 pr-0 pl-3 py-3",
            "bg-muted/95 hover:bg-muted border border-border/50 border-r-0",
            "rounded-l-xl shadow-lg",
            "text-muted-foreground hover:text-foreground",
            "transition-all duration-200 hover:pr-1"
          )}
          onClick={() => setRightVisible(true)}
          aria-label="Show stats sidebar"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <div className="flex flex-col items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider">Stats</span>
          </div>
          <div className="w-1 h-8 bg-primary/60 rounded-full mr-1" />
        </button>
      )}

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
