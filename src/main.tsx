import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App-full.css'
import App from './App-full.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
