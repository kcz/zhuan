import { useEffect, useMemo, useState } from 'react'
import type { ZhuanEntry } from '../types'
import { fallbackBuiltinEntries } from '../data/fallbackBuiltinEntries'

const normalizeEntry = (raw: unknown): ZhuanEntry | null => {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  if (typeof rec.hanzi !== 'string' || !rec.hanzi.trim()) return null

  const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `b:${rec.hanzi}`
  const keywords =
    Array.isArray(rec.keywords) && rec.keywords.every((x) => typeof x === 'string')
      ? (rec.keywords as string[]).map((x) => x.trim()).filter(Boolean)
      : [rec.hanzi]

  const components =
    Array.isArray(rec.components) && rec.components.every((x) => typeof x === 'string')
      ? (rec.components as string[]).map((x) => x.trim()).filter(Boolean)
      : undefined
  const derivatives =
    Array.isArray(rec.derivatives) && rec.derivatives.every((x) => typeof x === 'string')
      ? (rec.derivatives as string[]).map((x) => x.trim()).filter(Boolean)
      : undefined

  const glyph = (() => {
    const g = rec.glyph
    if (!g || typeof g !== 'object') return undefined
    const gr = g as Record<string, unknown>
    if (gr.type === 'imageUrl' && typeof gr.url === 'string') return { type: 'imageUrl' as const, url: gr.url }
    if (gr.type === 'image' && typeof gr.dataUrl === 'string') return { type: 'image' as const, dataUrl: gr.dataUrl }
    if (gr.type === 'svg' && typeof gr.svg === 'string') return { type: 'svg' as const, svg: gr.svg }
    return undefined
  })()

  return {
    id,
    origin: 'builtin',
    hanzi: rec.hanzi.trim(),
    pinyin: typeof rec.pinyin === 'string' ? rec.pinyin : undefined,
    meaning: typeof rec.meaning === 'string' ? rec.meaning : undefined,
    freqRank: typeof rec.freqRank === 'number' ? rec.freqRank : undefined,
    keywords,
    radicals: typeof rec.radicals === 'string' ? rec.radicals : undefined,
    components,
    derivatives,
    strokes: typeof rec.strokes === 'number' ? rec.strokes : undefined,
    examples:
      Array.isArray(rec.examples) && rec.examples.every((x) => typeof x === 'string')
        ? (rec.examples as string[])
        : undefined,
    notes: typeof rec.notes === 'string' ? rec.notes : undefined,
    tags:
      Array.isArray(rec.tags) && rec.tags.every((x) => typeof x === 'string')
        ? (rec.tags as string[])
        : undefined,
    glyph,
    createdAt: typeof rec.createdAt === 'number' ? rec.createdAt : undefined,
    updatedAt: typeof rec.updatedAt === 'number' ? rec.updatedAt : undefined,
  }
}

export const useBuiltinEntries = () => {
  const [entries, setEntries] = useState<ZhuanEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch('/library/builtin.json')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as unknown
        const arr = Array.isArray(json) ? json : null
        if (!arr) throw new Error('invalid json')
        const normalized = arr.map(normalizeEntry).filter(Boolean) as ZhuanEntry[]
        if (!normalized.length) throw new Error('empty library')

        if (!cancelled) {
          setEntries(normalized)
          setIsLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'load failed')
          setEntries(fallbackBuiltinEntries)
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(
    () => ({
      entries: entries ?? [],
      error,
      isFallback: Boolean(error),
      isLoading,
    }),
    [entries, error, isLoading],
  )
}
