import { Toaster } from 'sonner'

function AppToaster() {
  return (
    <Toaster
      theme="light"
      position="top-right"
      closeButton
      richColors
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'border border-border bg-surface text-text shadow-md font-sans text-[0.9rem]',
          title: 'font-semibold text-text',
          description: 'text-text-secondary',
          success: 'border-[#b7e4c7] bg-success-bg text-success-text',
          error: 'border-[#f5c2c0] bg-danger-bg text-danger-text',
          warning: 'border-[#f0d19a] bg-warning-bg text-warning-text',
          info: 'border-[#c5d0db] bg-info-bg text-info-text',
          closeButton: 'border-border bg-surface text-text-secondary',
        },
      }}
    />
  )
}

export default AppToaster
