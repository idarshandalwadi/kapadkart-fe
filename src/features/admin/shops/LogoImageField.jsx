import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { toast } from 'sonner'
import 'react-easy-crop/react-easy-crop.css'
import { uploadShopLogo } from '@/features/admin/shops/api'
import { resolveAdminAssetUrl } from '@/shared/utils/assetUrl'
import {
  extensionForMime,
  getCompressedCroppedImageBlob,
  isImageFile,
  readFileAsDataUrl,
} from '@/shared/utils/cropImage'

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'

const btnClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-[0.45rem] text-[0.8rem] font-semibold text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted'

export default function LogoImageField({
  value = '',
  slug = '',
  onChange,
  onPendingFile,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const previewObjectUrlRef = useRef('')

  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const [editorSrc, setEditorSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)

  const previewSrc = resolveAdminAssetUrl(value) || value

  const revokePreviewUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = ''
    }
  }

  useEffect(() => () => revokePreviewUrl(), [])

  useEffect(() => {
    if (!editorSrc) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) setEditorSrc(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editorSrc, saving])

  const openEditor = async (file) => {
    setError(null)
    if (!isImageFile(file)) {
      const message = 'Please choose a JPEG, PNG, WebP, or GIF image.'
      setError(message)
      toast.error(message)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      const message = 'Logo image must be 10MB or less.'
      setError(message)
      toast.error(message)
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setCroppedAreaPixels(null)
      setEditorSrc(dataUrl)
    } catch {
      const message = 'Could not read that image file.'
      setError(message)
      toast.error(message)
    }
  }

  const handleFiles = async (fileList) => {
    const file = Array.from(fileList || []).find(Boolean)
    if (file) await openEditor(file)
  }

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const closeEditor = () => {
    if (!saving) setEditorSrc(null)
  }

  const applyCrop = async () => {
    if (!editorSrc || !croppedAreaPixels) return
    setSaving(true)
    setError(null)
    try {
      const mimeType = 'image/jpeg'
      const blob = await getCompressedCroppedImageBlob(editorSrc, croppedAreaPixels, rotation, {
        mimeType,
        maxEdge: 400,
        maxBytes: 400 * 1024,
        initialQuality: 0.85,
        minEdge: 200,
      })
      const filename = `logo.${extensionForMime(mimeType)}`
      const file = new File([blob], filename, { type: mimeType })

      if (slug) {
        const uploaded = await uploadShopLogo(slug, file, filename)
        revokePreviewUrl()
        onPendingFile?.(null)
        onChange(uploaded.url)
        toast.success('Logo uploaded — save the shop to apply')
      } else {
        revokePreviewUrl()
        const previewUrl = URL.createObjectURL(blob)
        previewObjectUrlRef.current = previewUrl
        onPendingFile?.(file)
        onChange(previewUrl)
        toast.success('Logo ready — save the shop to apply')
      }
      setEditorSrc(null)
    } catch (err) {
      if (err?.silent) return
      const message = err?.message || 'Could not process the image. Try another file.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const clearLogo = () => {
    revokePreviewUrl()
    onPendingFile?.(null)
    onChange('')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    toast.success('Logo removed — save the shop to apply')
  }

  return (
    <div className="flex flex-col gap-3 min-[640px]:col-span-2">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
        <i className="fa-solid fa-image" aria-hidden="true" />
        Logo
      </span>

      {previewSrc ? (
        <div className="flex flex-wrap items-center gap-4">
          <div className="overflow-hidden rounded-xl border border-border bg-canvas p-2">
            <img src={previewSrc} alt="Shop logo preview" className="block h-20 w-20 object-contain" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnClass} onClick={() => inputRef.current?.click()}>
              <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
              Replace
            </button>
            <button
              type="button"
              className={`${btnClass} border-[rgba(180,35,24,0.35)] text-danger`}
              onClick={clearLogo}
            >
              <i className="fa-solid fa-trash" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`relative flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-border bg-canvas p-5 transition-[border-color,background-color] ${
            dragging ? 'border-accent bg-[rgba(217,119,6,0.08)]' : 'hover:border-accent'
          } cursor-pointer`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragging(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
        >
          <i className="fa-solid fa-cloud-arrow-up mb-1 text-2xl text-muted" aria-hidden="true" />
          <p className="m-0 text-sm font-semibold text-ink">Drop logo here</p>
          <p className="m-0 text-center text-xs text-muted">or click to browse · crop &amp; rotate before save</p>
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept={ACCEPTED}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {error && <p className="m-0 text-xs font-semibold text-danger">{error}</p>}
      <p className="m-0 text-xs text-muted">
        JPEG, PNG, WebP, or GIF up to 10MB. Images are compressed to 400KB before upload.
      </p>

      {editorSrc && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(17,17,17,0.55)] p-4"
          role="presentation"
          onClick={closeEditor}
        >
          <div
            className="flex w-[min(640px,100%)] max-h-[min(90vh,760px)] flex-col overflow-hidden rounded-2xl bg-surface shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Edit shop logo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="m-0 inline-flex items-center gap-2 text-base font-semibold text-ink">
                <i className="fa-solid fa-crop-simple" aria-hidden="true" />
                Crop &amp; rotate
              </h2>
              <button type="button" className={btnClass} onClick={closeEditor} disabled={saving}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
                Close
              </button>
            </div>

            <div className="relative h-[42vh] min-h-[280px] flex-1 bg-[#111]">
              <Cropper
                image={editorSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
              <div className="grid grid-cols-[4.5rem_1fr_2.75rem] items-center gap-2">
                <label htmlFor={`${inputId}-zoom`} className="text-xs font-semibold text-muted">
                  Zoom
                </label>
                <input
                  id={`${inputId}-zoom`}
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-accent"
                />
                <span className="text-right text-xs font-semibold text-muted">{zoom.toFixed(2)}×</span>
              </div>

              <div className="grid grid-cols-[4.5rem_1fr_2.75rem] items-center gap-2">
                <label htmlFor={`${inputId}-rotate`} className="text-xs font-semibold text-muted">
                  Rotate
                </label>
                <input
                  id={`${inputId}-rotate`}
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-accent"
                />
                <span className="text-right text-xs font-semibold text-muted">{Math.round(rotation)}°</span>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  className={btnClass}
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  disabled={saving}
                >
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                  Rotate 90°
                </button>
                <div className="ml-auto flex gap-2">
                  <button type="button" className={btnClass} onClick={closeEditor} disabled={saving}>
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={btnClass}
                    onClick={applyCrop}
                    disabled={saving || !croppedAreaPixels}
                  >
                    {saving ? (
                      <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                    ) : (
                      <i className="fa-solid fa-check" aria-hidden="true" />
                    )}
                    {saving ? 'Uploading…' : 'Use logo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
