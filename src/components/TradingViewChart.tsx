"use client"

import React, { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol: string
  theme?: 'light' | 'dark'
  autosize?: boolean
  height?: number | string
  width?: number | string
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  theme = 'dark',
  autosize = true,
  height,
  width
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Clean up any existing widgets
    if (containerRef.current != null) {
      containerRef.current.innerHTML = ''
    }
    
    // Skip if no symbol is provided
    if (!symbol) {
      return
    }
    
    // Format the symbol for TradingView (e.g., "BTC" -> "BINANCE:BTCUSDT")
    // You may need to adjust this based on the format your positions use
    const formattedSymbol = `BINANCE:${symbol}USDT`
    
    // Create the TradingView widget script
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (window.TradingView != null && containerRef.current != null) {
        new window.TradingView.widget({
          autosize,
          symbol: formattedSymbol,
          interval: '60',
          timezone: 'Etc/UTC',
          theme,
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current.id,
          height: autosize ? '100%' : height,
          width: autosize ? '100%' : width,
        })
      }
    }
    
    // Add the script to the document
    document.head.appendChild(script)
    
    // Log the chart creation
    console.log({
      event: 'tradingview_chart_created',
      timestamp: new Date().toISOString(),
      symbol: formattedSymbol
    })
    
    // Clean up
    return () => {
      if (script.parentNode != null) {
        script.parentNode.removeChild(script)
      }
    }
  }, [symbol, theme, autosize, height, width])
  
  return (
    <div className="w-full h-full border border-gray-700 rounded-lg overflow-hidden">
      {symbol ? (
        <div
          id={`tradingview_chart_${symbol}`}
          ref={containerRef}
          className="w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          Select a position to view chart
        </div>
      )}
    </div>
  )
}

// Add TradingView types to the Window interface
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: unknown) => unknown
    }
  }
}

export default TradingViewChart
