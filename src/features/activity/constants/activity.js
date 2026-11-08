export const ACTIVITY_ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'stock_added', label: 'Stock Added' },
  { value: 'booking_sent', label: 'Dispatched / Sent' },
  { value: 'return_created', label: 'Return Processed' },
  { value: 'restore_damaged', label: 'Restored Damaged' },
  { value: 'cancel', label: 'Cancelled' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'password_change', label: 'Password change' },
]

export const ACTIVITY_ENTITY_OPTIONS = [
  { value: '', label: 'All modules' },
  { value: 'product', label: 'Product' },
  { value: 'booking', label: 'Rental / Booking' },
  { value: 'sale', label: 'Sale' },
  { value: 'booking_return', label: 'Rental Return' },
  { value: 'payment', label: 'Payment' },
  { value: 'settings', label: 'Settings' },
  { value: 'brand', label: 'Brand' },
  { value: 'category', label: 'Category' },
  { value: 'auth', label: 'Auth' },
]

export const ACTIVITY_LIMIT_OPTIONS = [20, 50, 100]

export const ACTIVITY_TABLE_COLUMNS = [
  { key: 'when', label: 'When' },
  { key: 'user', label: 'User' },
  { key: 'action', label: 'Action' },
  { key: 'module', label: 'Module' },
  { key: 'summary', label: 'Summary' },
]

export function formatActivityAction(action) {
  const map = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    stock_added: 'Stock Added',
    booking_sent: 'Dispatched',
    return_created: 'Returned',
    restore_damaged: 'Restored',
    cancel: 'Cancelled',
    payment_received: 'Payment',
    login: 'Signed in',
    logout: 'Signed out',
    password_change: 'Password changed',
    upload: 'Uploaded',
  }
  return map[action] || action
}

export function formatActivityEntity(entityType) {
  const map = {
    product: 'Product',
    booking: 'Rental',
    sale: 'Sale',
    booking_return: 'Return',
    payment: 'Payment',
    settings: 'Settings',
    brand: 'Brand',
    category: 'Category',
    auth: 'Auth',
    upload: 'Upload',
  }
  return map[entityType] || entityType
}

export function actionBadgeClass(action) {
  switch (action) {
    case 'create':
    case 'login':
    case 'stock_added':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'update':
    case 'booking_sent':
    case 'password_change':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'delete':
    case 'cancel':
      return 'bg-red-50 text-red-800 ring-red-200'
    case 'return_created':
    case 'restore_damaged':
      return 'bg-blue-50 text-blue-800 ring-blue-200'
    case 'payment_received':
      return 'bg-indigo-50 text-indigo-800 ring-indigo-200'
    case 'logout':
    case 'upload':
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

