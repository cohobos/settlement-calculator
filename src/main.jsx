import React from 'react'
import { createRoot } from 'react-dom/client'
import SettlementCalculator from './SettlementCalculator.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettlementCalculator />
  </React.StrictMode>
)