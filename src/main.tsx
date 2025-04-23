import './polyfills.ts' // Harus diimpor pertama kali
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize environment variables
declare global {
  interface Window {
    __ENV: Record<string, string>;
  }
}

// Set environment variables
window.__ENV = {
  REACT_APP_BOT_API_ENDPOINT: import.meta.env.VITE_BOT_API_ENDPOINT || 'http://localhost:3001',
  REACT_APP_BOT_API_KEY: import.meta.env.VITE_BOT_API_KEY || 'notulen-ai-bot-key',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
