"use client"

import TradingViewChart from "./TradingViewChart"


export default function MainView() {
  return (
      <div>
        <TradingViewChart symbol="BTC" autosize={false} height={700} width={'100%'}/>
      </div>
  )
}
