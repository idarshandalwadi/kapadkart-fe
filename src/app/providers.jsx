import { AuthProvider as ClientAuthProvider } from '@/features/auth/context/AuthContext'
import { AuthProvider as AdminAuthProvider } from '@/features/admin/auth/AuthContext'
import AppToaster from '@/shared/components/AppToaster'
import { useFlashNotice } from '@/shared/hooks/useFlashNotice'

function FlashNoticeListener() {
  useFlashNotice()
  return null
}

export function AppProviders({ children }) {
  return (
    <ClientAuthProvider>
      <AdminAuthProvider>
        <FlashNoticeListener />
        <AppToaster />
        {children}
      </AdminAuthProvider>
    </ClientAuthProvider>
  )
}
