import type { ReactNode } from "react"

interface GameLayoutProps {
  header?: ReactNode
  leftSidebar: ReactNode
  mainContent: ReactNode
  rightSidebar: ReactNode
  controls?: ReactNode
}

export function GameLayout({
  header,
  leftSidebar,
  mainContent,
  rightSidebar,
  controls
}: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(226,232,240,0.9))] text-slate-900">
      {header}
      <div className="px-4 pb-8 pt-4 md:px-6 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="hidden lg:block">{leftSidebar}</aside>
          <main className="flex justify-center">{mainContent}</main>
          <aside className="hidden lg:block">{rightSidebar}</aside>
        </div>
      </div>
      {controls ? (
        <div className="sticky bottom-0 z-40 border-t border-slate-200/70 bg-white/80 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-0">
          {controls}
        </div>
      ) : null}
    </div>
  )
}
