import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App'
import './index.css'
import { installMarketScopeInterceptor } from './shared/api/marketScopeInterceptor'
import { seedDemo } from './demo/seedDemo'
import { demoAdapter } from './demo/demoAdapter'

// Demo mode (GitHub Pages static build): no backend — seed client state and
// resolve every /api/ request from baked JSON. Gated so normal dev/prod is
// untouched. Must run before the app mounts (and before the first fetchMe()).
// seedDemo/demoAdapter are side-effect-free on import; they run only here.
if (import.meta.env.VITE_DEMO === '1') {
  seedDemo()
  axios.defaults.adapter = demoAdapter
}

// Make every /api/ request carry the selected region/assetType (IN/US/EU/crypto).
installMarketScopeInterceptor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)