import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { installMarketScopeInterceptor } from './shared/api/marketScopeInterceptor'

// Make every /api/ request carry the selected region/assetType (IN/US/EU/crypto).
installMarketScopeInterceptor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)