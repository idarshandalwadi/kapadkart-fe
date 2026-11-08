import OfflineBanner from '@/shared/components/OfflineBanner'
import PWAReloadPrompt from '@/shared/components/PWAReloadPrompt'
import { AppRoutes } from './routes'

function App() {
  return (
    <>
      <OfflineBanner />
      <PWAReloadPrompt />
      <AppRoutes />
    </>
  )
}

export default App
