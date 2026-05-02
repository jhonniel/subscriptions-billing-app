import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Bootstrap } from './Bootstrap.tsx'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Bootstrap>
        <App />
      </Bootstrap>
    </BrowserRouter>
  </StrictMode>,
)
