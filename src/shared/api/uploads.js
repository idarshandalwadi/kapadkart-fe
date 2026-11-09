import { authFetch } from '@/shared/api/http'

/**
 * Upload a File/Blob to tenant storage.
 * @param {'branding'|'products'|'templates'} category
 * @param {Blob|File} file
 * @param {string} [filename]
 */
export async function uploadAsset(category, file, filename = 'upload.bin') {
  const formData = new FormData()
  formData.append('file', file, filename)

  const json = await authFetch(`/api/uploads/${category}`, {
    method: 'POST',
    body: formData,
  })

  return json.data
}

export function uploadBrandingLogo(file, filename = 'logo.png') {
  return uploadAsset('branding', file, filename)
}

export function uploadProductImage(file, filename = 'product.jpg') {
  return uploadAsset('products', file, filename)
}

export function uploadTemplate(file, filename = 'bill.html') {
  return uploadAsset('templates', file, filename)
}

/**
 * Delete an uploaded object that was removed before it was saved on a record.
 * Saved logos and product images are deleted by the API when the form is saved.
 */
export function removeUploadedAsset(url) {
  return authFetch('/api/uploads/remove', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}
