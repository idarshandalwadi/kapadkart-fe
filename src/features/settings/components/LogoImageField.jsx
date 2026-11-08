import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { toast } from 'sonner'
import {
  extensionForMime,
  getCompressedCroppedImageBlob,
  isImageFile,
  readFileAsDataUrl,
} from '@/features/products/utils/cropImage'
import { uploadBrandingLogo } from '@/shared/api/uploads'
import BrandLogo from '@/shared/components/BrandLogo'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { resolveBrandAssetUrl } from '@/shared/tenant/tenant'
import { cn } from '@/shared/utils/cn'

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'

function LogoImageField({ value = '', onChange }) {
  const inputId = useId()
  const inputRef = useRef(null)

  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const [editorSrc, setEditorSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)

  const previewSrc = resolveBrandAssetUrl(value) || value

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
      const uploaded = await uploadBrandingLogo(blob, `logo.${extensionForMime(mimeType)}`)
      onChange(uploaded.url)
      setEditorSrc(null)
      toast.success('Logo uploaded — save settings to apply')
    } catch (err) {
      const message = err?.message || 'Could not upload the image. Try another file.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmRemove = () => {
    onChange('')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    setRemoveConfirmOpen(false)
    toast.info('Logo removed — save settings to apply')
  }

  return (
    <div className="form-field form-field-full">
      <label className="text-[0.82rem] font-semibold text-text-secondary select-none">
        Company Logo
      </label>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mt-1">
        {previewSrc ? (
          /* Preview Tile */
          <div
            className="group relative size-28 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-border/80 bg-surface shadow-xs transition-all duration-160 hover:border-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            title="Click to replace company logo"
          >
            {/* Checkered pattern background for transparent logos */}
            <div
              className="absolute inset-0 bg-[#f8f9fa] opacity-80"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
              }}
            />

            {/* Logo Image */}
            <div className="relative flex h-full w-full items-center justify-center p-2.5">
              <BrandLogo
                src={previewSrc}
                alt="Company logo preview"
                surface="light"
                imgClassName="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Hover / Focus Overlay */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white opacity-0 backdrop-blur-[1px] transition-opacity duration-160 group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            >
              <i className="fa-solid fa-camera text-base" />
              <span className="text-[0.7rem] font-semibold tracking-wide">Edit Logo</span>
            </div>
          </div>
        ) : (
          /* Empty / Dropzone Tile */
          <div
            className={cn(
              'group relative flex size-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed transition-all duration-160 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent text-center p-2',
              dragging
                ? 'border-accent bg-accent/10 scale-102'
                : 'border-border/90 bg-surface-muted/60 hover:border-accent hover:bg-surface-muted',
            )}
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
            title="Click or drag image to upload logo"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-accent transition-transform duration-160 group-hover:scale-110">
              <i className="fa-solid fa-cloud-arrow-up text-sm" aria-hidden="true" />
            </div>
            <span className="text-[0.72rem] font-bold text-text-secondary">Upload Logo</span>
          </div>
        )}

        {/* Action Controls & Description */}
        <div className="flex flex-col items-center sm:items-start gap-2.5 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              className="btn-secondary h-9 px-3.5 text-xs font-semibold rounded-lg"
              onClick={() => inputRef.current?.click()}
            >
              <i className="fa-solid fa-upload text-[0.75rem]" aria-hidden="true" />
              <span>{previewSrc ? 'Replace' : 'Upload'}</span>
            </button>

            {previewSrc && (
              <button
                type="button"
                className="btn-outline h-9 px-3.5 text-xs font-semibold text-danger hover:border-danger hover:bg-danger/5 rounded-lg"
                onClick={() => setRemoveConfirmOpen(true)}
              >
                <i className="fa-solid fa-trash-can text-[0.75rem]" aria-hidden="true" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <p className="m-0 text-[0.76rem] text-text-muted leading-relaxed max-w-md">
            JPEG, PNG, WebP or GIF up to 10MB. Square image recommended. Displays on bills, dashboard, and customer receipts.
          </p>

          {error && (
            <p className="field-error flex items-center gap-1.5 text-xs text-danger font-medium mt-0.5">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>

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

      {/* Crop & Rotate Modal */}
      {editorSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-soft-in"
          role="presentation"
          onClick={closeEditor}
        >
          <div
            className="flex max-h-[min(92vh,780px)] w-[min(580px,100%)] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl border border-border animate-fade-up"
            role="dialog"
            aria-modal="true"
            aria-label="Crop company logo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface-muted/50">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent text-xs">
                  <i className="fa-solid fa-crop-simple" aria-hidden="true" />
                </span>
                <h3 className="m-0 font-display text-base font-bold text-text">
                  Crop &amp; Position Logo
                </h3>
              </div>
              <button
                type="button"
                className="size-7 rounded-lg text-text-muted hover:bg-surface-muted hover:text-text flex items-center justify-center transition cursor-pointer"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close dialog"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="relative h-[42vh] min-h-[280px] flex-1 bg-[#121316]">
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

            <div className="flex flex-col gap-3.5 border-t border-border px-5 py-4 bg-surface">
              <div className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2.5">
                <label htmlFor={`${inputId}-zoom`} className="text-xs font-semibold text-text-secondary">
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
                  className="w-full accent-amber-600"
                />
                <span className="text-right text-xs font-mono text-text-muted">
                  {zoom.toFixed(1)}×
                </span>
              </div>

              <div className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2.5">
                <label htmlFor={`${inputId}-rotate`} className="text-xs font-semibold text-text-secondary">
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
                  className="w-full accent-amber-600"
                />
                <span className="text-right text-xs font-mono text-text-muted">
                  {Math.round(rotation)}°
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  type="button"
                  className="btn-secondary h-9 px-3 text-xs rounded-lg"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  disabled={saving}
                >
                  <i className="fa-solid fa-rotate-right text-xs mr-1" aria-hidden="true" />
                  Rotate 90°
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-outline h-9 px-3 text-xs rounded-lg"
                    onClick={closeEditor}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary h-9 px-4 text-xs rounded-lg"
                    onClick={applyCrop}
                    disabled={saving || !croppedAreaPixels}
                  >
                    {saving ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs" aria-hidden="true" />
                        <span>Compressing…</span>
                      </>
                    ) : (
                      <span>Apply Logo</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Logo Confirmation */}
      <ConfirmDialog
        open={removeConfirmOpen}
        title="Remove Company Logo"
        message="Are you sure you want to remove the company logo? You will need to save settings to confirm this change."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveConfirmOpen(false)}
      />
    </div>
  )
}

export default LogoImageField
