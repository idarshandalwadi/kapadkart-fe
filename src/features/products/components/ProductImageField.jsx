import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { toast } from 'sonner'
import {
  extensionForMime,
  getCompressedCroppedImageBlob,
  isImageFile,
  prepareImageForEditor,
} from '@/features/products/utils/cropImage'
import { getProductImageUrl } from '@/config/api'
import { MAX_PRODUCT_IMAGES } from '@/features/products/utils/productImages'
import { uploadProductImage } from '@/shared/api/uploads'
import { cn } from '@/shared/utils/cn'

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
const EDITOR_MAX_EDGE = 2400

const imageBtnClass =
  'rounded-lg border border-border bg-white px-3 py-[0.45rem] font-inherit text-[0.8rem] font-[650] text-text transition-[background-color,border-color] duration-160 hover:border-border-strong hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-55'

function ProductImageField({ value = [], onChange, product }) {
  const images = Array.isArray(value) ? value : []
  const imagesRef = useRef(images)
  imagesRef.current = images

  const inputId = useId()
  const inputRef = useRef(null)
  const queueRef = useRef([])
  const replaceIndexRef = useRef(null)
  const editorCleanupRef = useRef(null)

  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const [editorSrc, setEditorSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [queueLeft, setQueueLeft] = useState(0)

  const atLimit = images.length >= MAX_PRODUCT_IMAGES

  const releaseEditorSrc = useCallback(() => {
    editorCleanupRef.current?.()
    editorCleanupRef.current = null
    setEditorSrc(null)
  }, [])

  const dismissEditor = useCallback(() => {
    queueRef.current = []
    replaceIndexRef.current = null
    setQueueLeft(0)
    releaseEditorSrc()
  }, [releaseEditorSrc])

  useEffect(() => {
    return () => {
      editorCleanupRef.current?.()
      editorCleanupRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!editorSrc) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) dismissEditor()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dismissEditor, editorSrc, saving])

  const openEditor = async (file) => {
    setError(null)
    if (!isImageFile(file)) {
      const message = 'Please choose a JPEG, PNG, WebP, or GIF image.'
      setError(message)
      toast.error(message)
      return false
    }

    if (file.size > UPLOAD_MAX_BYTES) {
      const message = 'Product image must be 10MB or less.'
      setError(message)
      toast.error(message)
      return false
    }

    setPreparing(true)
    try {
      const prepared = await prepareImageForEditor(file, { maxEdge: EDITOR_MAX_EDGE })
      editorCleanupRef.current?.()
      editorCleanupRef.current = prepared.cleanup
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setCroppedAreaPixels(null)
      setEditorSrc(prepared.src)
      return true
    } catch {
      const message = 'Could not read that image file.'
      setError(message)
      toast.error(message)
      return false
    } finally {
      setPreparing(false)
    }
  }

  const processNextInQueue = async () => {
    const next = queueRef.current.shift()
    setQueueLeft(queueRef.current.length)
    if (!next) {
      replaceIndexRef.current = null
      releaseEditorSrc()
      return
    }
    const ok = await openEditor(next)
    if (!ok) {
      queueRef.current = []
      replaceIndexRef.current = null
      setQueueLeft(0)
      releaseEditorSrc()
    }
  }

  const handleFiles = async (fileList, { replaceIndex = null } = {}) => {
    const files = Array.from(fileList || []).filter(Boolean)
    if (!files.length) return

    if (replaceIndex != null) {
      replaceIndexRef.current = replaceIndex
      queueRef.current = files.slice(0, 1)
      setQueueLeft(0)
      await processNextInQueue()
      return
    }

    const slots = MAX_PRODUCT_IMAGES - imagesRef.current.length
    if (slots <= 0) {
      setError(`You can add up to ${MAX_PRODUCT_IMAGES} images.`)
      return
    }

    const accepted = files.slice(0, slots)
    if (files.length > slots) {
      setError(`Only ${slots} more image${slots === 1 ? '' : 's'} can be added (max ${MAX_PRODUCT_IMAGES}).`)
    } else {
      setError(null)
    }

    replaceIndexRef.current = null
    queueRef.current = accepted
    setQueueLeft(Math.max(0, accepted.length - 1))
    await processNextInQueue()
  }

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const closeEditor = () => {
    if (saving || preparing) return
    dismissEditor()
  }

  const applyCrop = async () => {
    if (!editorSrc || !croppedAreaPixels) return
    setSaving(true)
    setError(null)
    try {
      const mimeType = 'image/jpeg'
      const blob = await getCompressedCroppedImageBlob(editorSrc, croppedAreaPixels, rotation, {
        mimeType,
        maxEdge: 1600,
        maxBytes: UPLOAD_MAX_BYTES,
        initialQuality: 0.9,
        minQuality: 0.45,
        minEdge: 480,
      })
      const uploaded = await uploadProductImage(
        blob,
        `product.${extensionForMime(mimeType)}`,
      )
      const url = uploaded.url

      const current = imagesRef.current
      const replaceIndex = replaceIndexRef.current
      if (replaceIndex != null) {
        const next = current.map((img, i) => (i === replaceIndex ? url : img))
        imagesRef.current = next
        onChange(next)
        replaceIndexRef.current = null
        queueRef.current = []
        setQueueLeft(0)
        releaseEditorSrc()
      } else {
        const next = [...current, url]
        imagesRef.current = next
        onChange(next)
        await processNextInQueue()
      }
    } catch (err) {
      const message = err?.message || 'Could not upload the image. Try another file.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const removeAt = (index) => {
    onChange(images.filter((_, i) => i !== index))
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const moveAt = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= images.length) return
    const next = [...images]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  const previewFor = (src) =>
    getProductImageUrl({
      image: src,
      id: product?.id,
      product_name: product?.product_name,
    })

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-0">
          {images.map((src, index) => (
            <li
              key={`${index}-${src.slice(0, 48)}`}
              className="relative overflow-hidden rounded-xl border border-border bg-[#111]"
            >
              <img
                src={previewFor(src)}
                alt={`Product image ${index + 1}`}
                className="block aspect-[4/5] w-full object-cover"
              />
              {index === 0 && (
                <span className="absolute top-2 left-2 rounded-md bg-[rgba(17,17,17,0.75)] px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-white uppercase">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-[linear-gradient(transparent,rgba(0,0,0,0.72))] p-2">
                <button
                  type="button"
                  className={cn(imageBtnClass, 'px-2 py-1 text-[0.72rem]')}
                  onClick={() => moveAt(index, -1)}
                  disabled={index === 0}
                  aria-label="Move image earlier"
                >
                  ←
                </button>
                <button
                  type="button"
                  className={cn(imageBtnClass, 'px-2 py-1 text-[0.72rem]')}
                  onClick={() => moveAt(index, 1)}
                  disabled={index === images.length - 1}
                  aria-label="Move image later"
                >
                  →
                </button>
                <button
                  type="button"
                  className={cn(imageBtnClass, 'px-2 py-1 text-[0.72rem]')}
                  onClick={() => {
                    replaceIndexRef.current = index
                    inputRef.current?.click()
                  }}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className={cn(
                    imageBtnClass,
                    'ml-auto border-[rgba(180,35,24,0.35)] px-2 py-1 text-[0.72rem] text-danger-text',
                  )}
                  onClick={() => removeAt(index)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          'relative flex min-h-[140px] flex-col items-center justify-center gap-[0.45rem] rounded-xl border-[1.5px] border-dashed border-border-strong bg-surface-muted p-5 transition-[border-color,background-color,box-shadow] duration-160',
          'hover:border-accent hover:shadow-[0_0_0_3px_rgba(217,119,6,0.2)] hover:outline-none',
          'focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_rgba(217,119,6,0.2)] focus-visible:outline-none',
          dragging && 'border-accent bg-[rgba(251,191,36,0.12)]',
          atLimit || preparing ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
        )}
        role={atLimit || preparing ? undefined : 'button'}
        tabIndex={atLimit || preparing ? undefined : 0}
        onClick={() => {
          if (!atLimit && !preparing) inputRef.current?.click()
        }}
        onKeyDown={(e) => {
          if (!atLimit && !preparing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!atLimit && !preparing) setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!atLimit && !preparing) setDragging(true)
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
          if (!atLimit && !preparing) handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="sr-only"
          type="file"
          accept={ACCEPTED}
          multiple
          disabled={preparing}
          onChange={(e) => {
            const replaceIndex = replaceIndexRef.current
            handleFiles(e.target.files, {
              replaceIndex: replaceIndex != null ? replaceIndex : null,
            })
            e.target.value = ''
          }}
        />

        <p className="m-0 text-[0.95rem] font-bold text-text">
          {atLimit
            ? `Maximum of ${MAX_PRODUCT_IMAGES} images`
            : preparing
              ? 'Preparing image…'
              : 'Drop product images here'}
        </p>
        <p className="m-0 text-center text-[0.8rem] text-text-muted">
          {atLimit
            ? 'Remove one to add another'
            : preparing
              ? 'Large photos are resized for the editor, then compressed before upload'
              : `or click to browse · up to ${MAX_PRODUCT_IMAGES} · max 10 MB each · crop & rotate`}
        </p>
        {images.length > 0 && !atLimit && (
          <p className="m-0 text-[0.75rem] font-semibold text-text-secondary">
            {images.length} / {MAX_PRODUCT_IMAGES} added
          </p>
        )}
      </div>

      {error && <p className="m-0 text-[0.78rem] font-semibold text-danger-text">{error}</p>}

      {editorSrc && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(17,17,17,0.55)] p-4"
          role="presentation"
          onClick={closeEditor}
        >
          <div
            className="flex w-[min(640px,100%)] max-h-[min(90vh,760px)] flex-col overflow-hidden rounded-[14px] bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.28)]"
            role="dialog"
            aria-modal="true"
            aria-label="Edit product image"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 bg-[radial-gradient(ellipse_70%_120%_at_100%_0%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
                  <i className="fa-solid fa-crop-simple text-sm" aria-hidden="true" />
                </span>
                <h2 className="m-0 font-display text-[1.1rem] font-semibold text-text">
                  Crop &amp; Rotate Photo
                  {queueLeft > 0 ? (
                    <span className="ml-2 text-xs font-sans font-semibold text-text-muted">
                      ({queueLeft} more after this)
                    </span>
                  ) : null}
                </h2>
              </div>
              <button
                type="button"
                className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer disabled:opacity-50"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
              </button>
            </div>

            <div className="relative h-[42vh] min-h-[280px] flex-1 bg-[#111]">
              <Cropper
                image={editorSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={4 / 5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>

            <div className="flex flex-col gap-[0.85rem] border-t border-border px-4 py-[0.95rem]">
              <div className="grid grid-cols-[4.5rem_1fr_2.75rem] items-center gap-[0.65rem]">
                <label htmlFor={`${inputId}-zoom`} className="text-[0.8rem] font-semibold text-text-secondary">
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
                  className="h-2 w-full cursor-pointer appearance-auto rounded-lg bg-neutral-200 accent-accent"
                />
                <span className="text-right text-[0.78rem] font-semibold text-text-muted">
                  {zoom.toFixed(2)}×
                </span>
              </div>

              <div className="grid grid-cols-[4.5rem_1fr_2.75rem] items-center gap-[0.65rem]">
                <label htmlFor={`${inputId}-rotate`} className="text-[0.8rem] font-semibold text-text-secondary">
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
                  className="h-2 w-full cursor-pointer appearance-auto rounded-lg bg-neutral-200 accent-accent"
                />
                <span className="text-right text-[0.78rem] font-semibold text-text-muted">
                  {Math.round(rotation)}°
                </span>
              </div>

              <div className="flex flex-wrap justify-between gap-[0.6rem]">
                <button
                  type="button"
                  className={imageBtnClass}
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  disabled={saving}
                >
                  Rotate 90°
                </button>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    className={imageBtnClass}
                    onClick={closeEditor}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={cn(
                      imageBtnClass,
                      'border-0 bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_55%,#d97706_100%)] text-white',
                    )}
                    onClick={applyCrop}
                    disabled={saving || !croppedAreaPixels}
                  >
                    {saving ? 'Uploading…' : queueLeft > 0 ? 'Use & next' : 'Use image'}
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

export default ProductImageField
