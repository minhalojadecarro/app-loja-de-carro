import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom' // <--- 1. Importe o HashRouter
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter> {/* <--- 2. Envolva o App com o HashRouter */}
      <App />
    </HashRouter>
  </StrictMode>,
)