import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Glyph, ZhuanEntry } from '../types'
import { sanitizeSvg } from '../lib/sanitizeSvg'
import { readJson, removeKey, writeJson } from '../lib/storage'

const STORAGE_KEY = 'zhuan-learn.customEntries.v1'

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean)
}

const normalizeGlyph = (raw: unknown): Glyph | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const rec = raw as Record<string, unknown>
  const type = rec.type
  if (type === 'svg' && typeof rec.svg === 'string') {
    const cleaned = sanitizeSvg(rec.svg)
    if (!cleaned) return undefined
    return { type: 'svg', svg: cleaned }
  }
  if (type === 'image' && typeof rec.dataUrl === 'string') {
    if (!rec.dataUrl.startsWith('data:')) return undefined
    return { type: 'image', dataUrl: rec.dataUrl }
  }
  if (type === 'imageUrl' && typeof rec.url === 'string') {
    if (!/^https?:\/\//.test(rec.url)) return undefined
    return { type: 'imageUrl', url: rec.url }
  }
  return undefined
}

const normalizeEntry = (raw: unknown): ZhuanEntry | null => {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>

  const id = typeof rec.id === 'string' ? rec.id : null
  const hanzi = typeof rec.hanzi === 'string' ? rec.hanzi.trim() : ''

  if (!id || !hanzi) return null

  const keywords = toStringArray(rec.keywords)
  const examples = toStringArray(rec.examples)
  const tags = toStringArray(rec.tags)
  const glyph = normalizeGlyph(rec.glyph)

  const createdAt = typeof rec.createdAt === 'number' ? rec.createdAt : undefined
  const updatedAt = typeof rec.updatedAt === 'number' ? rec.updatedAt : undefined

  const strokes = typeof rec.strokes === 'number' ? rec.strokes : undefined
  const radicals = typeof rec.radicals === 'string' ? rec.radicals : undefined

  const pinyin = typeof rec.pinyin === 'string' ? rec.pinyin : undefined
  const meaning = typeof rec.meaning === 'string' ? rec.meaning : undefined
  const notes = typeof rec.notes === 'string' ? rec.notes : undefined

  return {
    id,
    origin: 'custom',
    hanzi,
    pinyin,
    meaning,
    keywords,
    radicals,
    strokes,
    examples: examples.length ? examples : undefined,
    notes,
    tags: tags.length ? tags : undefined,
    glyph,
    createdAt,
    updatedAt,
  }
}

const safeReadEntries = () => {
  const raw = readJson<unknown>(STORAGE_KEY)
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeEntry).filter(Boolean) as ZhuanEntry[]
}

const newId = () => {
  const uuid = globalThis.crypto?.randomUUID?.()
  return `c:${uuid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

export type UpsertInput = Omit<ZhuanEntry, 'origin' | 'id'> & { id?: string }

export type ZhuanLibraryApi = {
  customEntries: ZhuanEntry[]
  upsert: (input: UpsertInput) => ZhuanEntry
  remove: (id: string) => void
  exportJson: () => string
  importJson: (jsonText: string) => { imported: number; rejected: number }
  reset: () => void
}

export const useZhuanLibrary = (): ZhuanLibraryApi => {
  const [customEntries, setCustomEntries] = useState<ZhuanEntry[]>(() => safeReadEntries())

  useEffect(() => {
    writeJson(STORAGE_KEY, customEntries)
  }, [customEntries])

  const upsert = useCallback((input: UpsertInput) => {
    const now = Date.now()
    const id = input.id?.trim() ? input.id.trim() : newId()

    const entry: ZhuanEntry = {
      id,
      origin: 'custom',
      hanzi: input.hanzi.trim(),
      pinyin: input.pinyin?.trim() || undefined,
      meaning: input.meaning?.trim() || undefined,
      keywords: input.keywords?.map((k) => k.trim()).filter(Boolean) ?? [],
      radicals: input.radicals?.trim() || undefined,
      strokes: typeof input.strokes === 'number' ? input.strokes : undefined,
      examples: input.examples?.map((x) => x.trim()).filter(Boolean) || undefined,
      notes: input.notes?.trim() || undefined,
      tags: input.tags?.map((t) => t.trim()).filter(Boolean) || undefined,
      glyph:
        input.glyph?.type === 'svg'
          ? (() => {
              const cleaned = sanitizeSvg(input.glyph.svg)
              return cleaned ? { type: 'svg', svg: cleaned } : undefined
            })()
          : input.glyph?.type === 'image'
            ? input.glyph
            : undefined,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    }

    setCustomEntries((prev) => {
      const next = [...prev]
      const index = next.findIndex((e) => e.id === id)
      if (index >= 0) next[index] = entry
      else next.unshift(entry)
      return next
    })

    return entry
  }, [])

  const remove = useCallback((id: string) => {
    setCustomEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const exportJson = useCallback(() => {
    return JSON.stringify(customEntries, null, 2)
  }, [customEntries])

  const importJson = useCallback((jsonText: string) => {
    try {
      const raw = JSON.parse(jsonText) as unknown
      if (!Array.isArray(raw)) return { imported: 0, rejected: 0 }

      const normalized = raw.map(normalizeEntry).filter(Boolean) as ZhuanEntry[]
      const rejected = raw.length - normalized.length

      setCustomEntries((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]))
        for (const e of normalized) byId.set(e.id, { ...e, origin: 'custom', updatedAt: Date.now() })
        return Array.from(byId.values()).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      })

      return { imported: normalized.length, rejected }
    } catch {
      return { imported: 0, rejected: 0 }
    }
  }, [])

  const reset = useCallback(() => {
    setCustomEntries([])
    removeKey(STORAGE_KEY)
  }, [])

  return useMemo(
    () => ({ customEntries, upsert, remove, exportJson, importJson, reset }),
    [customEntries, exportJson, importJson, remove, reset, upsert],
  )
}
