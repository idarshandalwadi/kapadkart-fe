import { useCallback, useEffect, useMemo, useState } from 'react'

function readStored(storageKey, allKeys, defaultKeys = null) {
  const fallback =
    Array.isArray(defaultKeys) && defaultKeys.length
      ? defaultKeys.filter((k) => allKeys.includes(k))
      : allKeys

  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return fallback

    const parsed = JSON.parse(raw)
    const storedVisible = Array.isArray(parsed) ? parsed : parsed?.visible
    const storedAvailable = Array.isArray(parsed) ? parsed : parsed?.available
    if (!Array.isArray(storedVisible)) return fallback

    const known = Array.isArray(storedAvailable) ? storedAvailable : storedVisible
    const validVisible = storedVisible.filter((key) => allKeys.includes(key))
    const newlyAdded = allKeys.filter((key) => !known.includes(key))
    const next = [...new Set([...validVisible, ...newlyAdded])]
    return next.length ? next : fallback
  } catch {
    return fallback
  }
}

function writeStored(storageKey, visible, allKeys) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ visible, available: allKeys }),
    )
  } catch {
    // Ignore quota / private-mode failures; in-session selection still works.
  }
}

export function isColumnVisible(visibleColumns, key) {
  if (!visibleColumns) return true
  return visibleColumns.includes(key)
}

export function useColumnVisibility(storageKey, columns, defaultKeys = null) {
  const allKeysSignature = columns.map((column) => column.key).join('|')
  const allKeys = useMemo(
    () => allKeysSignature.split('|').filter(Boolean),
    [allKeysSignature],
  )
  const defaultKeysSignature = Array.isArray(defaultKeys) ? defaultKeys.join('|') : ''
  const effectiveDefaultKeys = useMemo(
    () => (defaultKeysSignature ? defaultKeysSignature.split('|').filter(Boolean) : allKeys),
    [defaultKeysSignature, allKeys],
  )

  const [visibleKeys, setVisibleKeys] = useState(() =>
    readStored(storageKey, allKeys, effectiveDefaultKeys),
  )

  useEffect(() => {
    setVisibleKeys(readStored(storageKey, allKeys, effectiveDefaultKeys))
  }, [storageKey, allKeys, effectiveDefaultKeys])

  const commit = useCallback(
    (updater) => {
      setVisibleKeys((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        writeStored(storageKey, next, allKeys)
        return next
      })
    },
    [storageKey, allKeys],
  )

  const isVisible = useCallback(
    (key) => visibleKeys.includes(key),
    [visibleKeys],
  )

  const toggle = useCallback(
    (key) => {
      if (!allKeys.includes(key)) return
      commit((current) => {
        if (current.includes(key)) {
          if (current.length <= 1) return current
          return current.filter((item) => item !== key)
        }
        return allKeys.filter((item) => item === key || current.includes(item))
      })
    },
    [allKeys, commit],
  )

  const showAll = useCallback(() => {
    commit(allKeys)
  }, [allKeys, commit])

  const resetDefault = useCallback(() => {
    commit(effectiveDefaultKeys)
  }, [effectiveDefaultKeys, commit])

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.includes(column.key)),
    [columns, visibleKeys],
  )

  return {
    visibleKeys,
    visibleColumns,
    isVisible,
    toggle,
    showAll,
    resetDefault,
    isDefault:
      visibleKeys.length === effectiveDefaultKeys.length &&
      effectiveDefaultKeys.every((k) => visibleKeys.includes(k)),
    hiddenCount: Math.max(0, allKeys.length - visibleKeys.length),
  }
}
