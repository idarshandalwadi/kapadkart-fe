import { FIELD_LIMITS, maxLengthMessage } from '@/shared/constants/fieldLimits'

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
]

export const RENTAL_CALCULATION_MODES = [
  {
    value: 'DIFF_1_DAY',
    label: 'Next-day return = 1 day',
    badge: 'Recommended',
    description:
      'Same-day or next-day return counts as 1 rental day. Each extra day after that adds +1.',
    formula: 'return − pickup (minimum 1 day)',
    examples: [
      { dates: '1 Jan → 1 Jan', result: '1 day' },
      { dates: '1 Jan → 2 Jan', result: '1 day' },
      { dates: '1 Jan → 3 Jan', result: '2 days' },
    ],
  },
  {
    value: 'DIFF_2_DAYS',
    label: 'Two-day difference = 1 day',
    badge: 'Wedding / Event',
    description:
      'Pickup → event → return within 2 days difference counts as 1 base day. Extra days add +1 each.',
    formula: 'difference ≤ 2 days → 1 day, then +1 / day',
    examples: [
      { dates: '1 Jan → 1 Jan', result: '1 day' },
      { dates: '1 Jan → 3 Jan', result: '1 day' },
      { dates: '1 Jan → 4 Jan', result: '2 days' },
    ],
  },
  {
    value: 'CALENDAR_DAYS',
    label: 'Count every calendar day',
    badge: 'Daily rate',
    description:
      'Every calendar day in possession is charged. Same-day return is 1 day, next-day return is 2 days.',
    formula: '(return − pickup) + 1',
    examples: [
      { dates: '1 Jan → 1 Jan', result: '1 day' },
      { dates: '1 Jan → 2 Jan', result: '2 days' },
      { dates: '1 Jan → 3 Jan', result: '3 days' },
    ],
  },
]

export const EMPTY_SETTINGS_FORM = {
  company_name: '',
  logo_url: '',
  phone_number: '',
  address: '',
  gst_number: '',
  currency: 'INR',
  tax_rate: '0',
  upi_id: '',
  whatsapp_url: '',
  instagram_link: '',
  facebook_url: '',
  terms_and_conditions: '',
  rental_day_calculation_mode: 'DIFF_2_DAYS',
}

export const EMPTY_PASSWORD_FORM = {
  current_password: '',
  new_password: '',
  confirm_new_password: '',
}

const URL_REGEX = /^https?:\/\/.+/i
const GST_REGEX = /^[A-Za-z0-9]{15}$/

export function validateSettingsForm(form) {
  const errors = {}

  const companyName = form.company_name?.trim() ?? ''
  if (!companyName) {
    errors.company_name = 'Company name is required'
  } else if (companyName.length < 2) {
    errors.company_name = 'Company name must be at least 2 characters'
  } else if (String(form.company_name || '').length > FIELD_LIMITS.company_name) {
    errors.company_name = maxLengthMessage('Company name', FIELD_LIMITS.company_name)
  }

  const phone = form.phone_number?.trim() ?? ''
  if (!phone) {
    errors.phone_number = 'Phone number is required'
  } else if (phone.replace(/\D/g, '').length < 10) {
    errors.phone_number = 'Enter a valid phone number (at least 10 digits)'
  }

  const address = form.address?.trim() ?? ''
  if (!address) {
    errors.address = 'Address is required'
  } else if (String(form.address || '').length > FIELD_LIMITS.address) {
    errors.address = maxLengthMessage('Address', FIELD_LIMITS.address)
  }

  if (!form.currency || !CURRENCY_OPTIONS.some((opt) => opt.value === form.currency)) {
    errors.currency = 'Please select a valid currency'
  }

  const gst = form.gst_number?.trim() ?? ''
  if (gst && !GST_REGEX.test(gst)) {
    errors.gst_number = 'GST number must be exactly 15 alphanumeric characters'
  }

  if (form.tax_rate === '' || form.tax_rate === null || form.tax_rate === undefined) {
    errors.tax_rate = 'Tax rate is required'
  } else {
    const taxRate = Number(form.tax_rate)
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      errors.tax_rate = 'Tax rate must be between 0 and 100'
    }
  }

  const whatsapp = form.whatsapp_url?.trim() ?? ''
  if (whatsapp && !URL_REGEX.test(whatsapp)) {
    errors.whatsapp_url = 'Enter a valid WhatsApp URL starting with http:// or https://'
  } else if (String(form.whatsapp_url || '').length > FIELD_LIMITS.whatsapp_url) {
    errors.whatsapp_url = maxLengthMessage('WhatsApp URL', FIELD_LIMITS.whatsapp_url)
  }

  const instagram = form.instagram_link?.trim() ?? ''
  if (instagram && !URL_REGEX.test(instagram)) {
    errors.instagram_link = 'Enter a valid Instagram URL starting with http:// or https://'
  } else if (String(form.instagram_link || '').length > FIELD_LIMITS.instagram_link) {
    errors.instagram_link = maxLengthMessage('Instagram URL', FIELD_LIMITS.instagram_link)
  }

  const facebook = form.facebook_url?.trim() ?? ''
  if (facebook && !URL_REGEX.test(facebook)) {
    errors.facebook_url = 'Enter a valid Facebook URL starting with http:// or https://'
  } else if (String(form.facebook_url || '').length > FIELD_LIMITS.facebook_url) {
    errors.facebook_url = maxLengthMessage('Facebook URL', FIELD_LIMITS.facebook_url)
  }

  if (String(form.terms_and_conditions || '').length > FIELD_LIMITS.terms_and_conditions) {
    errors.terms_and_conditions = maxLengthMessage(
      'Terms & Conditions',
      FIELD_LIMITS.terms_and_conditions,
    )
  }

  const validModes = ['DIFF_1_DAY', 'DIFF_2_DAYS', 'CALENDAR_DAYS', 'USE_TO_RETURN', 'PICKUP_TO_RETURN', 'SAME_DAY', 'NEXT_DAY', 'TWO_DAY_DIFF']
  if (form.rental_day_calculation_mode && !validModes.includes(form.rental_day_calculation_mode)) {
    errors.rental_day_calculation_mode = 'Please select a valid rental day calculation mode'
  }

  return errors
}

export function validatePasswordForm(form) {
  const errors = {}

  if (!form.current_password) {
    errors.current_password = 'Current password is required'
  }

  if (!form.new_password) {
    errors.new_password = 'New password is required'
  } else if (form.new_password.length < 6) {
    errors.new_password = 'New password must be at least 6 characters'
  }

  if (!form.confirm_new_password) {
    errors.confirm_new_password = 'Confirm new password is required'
  } else if (form.new_password !== form.confirm_new_password) {
    errors.confirm_new_password = 'New password and confirm password must match'
  }

  return errors
}
