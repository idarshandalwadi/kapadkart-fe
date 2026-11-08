import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/app/App'
import { AppProviders } from '@/app/providers'
import '@/shared/styles/index.css'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)
