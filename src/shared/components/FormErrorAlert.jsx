import { cn } from '@/shared/utils/cn'

export function FormErrorAlert({
  message,
  fieldErrors,
  onDismiss,
  className,
}) {
  if (!message && (!fieldErrors || Object.keys(fieldErrors).length === 0)) {
    return null
  }

  const errorsList = fieldErrors
    ? Object.entries(fieldErrors).filter(([, val]) => Boolean(val))
    : []

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'relative mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[0.88rem] text-red-900 shadow-xs dark:border-red-900/60 dark:bg-red-950/80 dark:text-red-200 sm:p-4',
        className
      )}
    >
      <i
        className="fa-solid fa-circle-exclamation mt-0.5 text-base shrink-0 text-red-600 dark:text-red-300"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {message && <p className="m-0 font-medium leading-snug">{message}</p>}
        {errorsList.length > 0 && (
          <ul className="mt-1.5 mb-0 list-disc pl-4 space-y-0.5 text-xs text-red-800 dark:text-red-300">
            {errorsList.map(([key, val]) => (
              <li key={key}>
                <span className="font-semibold capitalize text-red-950 dark:text-red-100">
                  {key.replace(/_/g, ' ')}:
                </span>{' '}
                {val}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto -mr-1 -mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-red-700 transition-colors hover:bg-red-100/80 hover:text-red-950 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:text-red-300 dark:hover:bg-red-900/50 dark:hover:text-red-100"
          aria-label="Dismiss error"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default FormErrorAlert
