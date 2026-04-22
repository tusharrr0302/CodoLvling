import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { ProgressProvider } from './context/ProgressContext.jsx'
import App from './App.jsx'
import './index.css'

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Publishable Key")
}

import { AuthProvider } from './context/AuthContext.jsx'
import { MultiplayerProvider } from './context/MultiplayerContext.jsx'

if (!PUBLISHABLE_KEY) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#FCF6E5', minHeight: '100vh' }}>
      <h1 style={{ color: '#EF4444' }}>⚠️ CLERK KEY MISSING</h1>
      <p>Please add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to your <code>frontend/.env</code> file.</p>
    </div>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <AuthProvider>
          <ProgressProvider>
            <MultiplayerProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </MultiplayerProvider>
          </ProgressProvider>
        </AuthProvider>
      </ClerkProvider>
    </React.StrictMode>,
  )
}
