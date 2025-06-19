"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from 'lucide-react'
import TradingViewChart from "./TradingViewChart"

// Sample data for the table
const sampleData = [
  { asset: 'Bitcoin', symbol: 'BTC', price: '$64,231.50', change: '+2.34%' },
  { asset: 'Ethereum', symbol: 'ETH', price: '$3,456.78', change: '-1.23%' },
  { asset: 'Solana', symbol: 'SOL', price: '$142.67', change: '+5.67%' },
  { asset: 'Cardano', symbol: 'ADA', price: '$0.45', change: '+0.89%' },
]

export default function MainView() {
  const [showChart, setShowChart] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const toggleChart = () => {
    setIsLoading(true)
    setShowChart(!showChart)
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Crypto Dashboard</h1>
        <Button 
          onClick={toggleChart} 
          variant="outline" 
          className="gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : showChart ? (
            'Hide Chart'
          ) : (
            'Show Chart'
          )}
        </Button>
      </div>

      {showChart && (
        <div className="rounded-lg border p-4">
          <TradingViewChart symbol="BTC" autosize={false} height={500} width={'100%'} />
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead colSpan={4} className="text-center">Centered Title</TableHead></TableRow></TableHeader>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">24h Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleData.map((item) => (
              <TableRow key={item.symbol}>
                <TableCell className="font-medium">{item.asset}</TableCell>
                <TableCell>{item.symbol}</TableCell>
                <TableCell>{item.price}</TableCell>
                <TableCell className={item.change.startsWith('+') ? 'text-green-500 text-right' : 'text-red-500 text-right'}>
                  {item.change}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
