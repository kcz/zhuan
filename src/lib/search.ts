import type { ZhuanEntry } from '../types'
import * as OpenCC from 'opencc-js'
import { normalizePinyin, splitTerms } from './normalize'

type ScoredEntry = { entry: ZhuanEntry; score: number }

const cn2t = OpenCC.Converter({ from: 'cn', to: 'tw' })
const t2cn = OpenCC.Converter({ from: 'tw', to: 'cn' })

const buildTermVariants = (term: string) => {
  const lower = term.toLowerCase()
  const s2t = cn2t(lower)
  const t2s = t2cn(lower)
  const variants = new Set([lower, s2t, t2s].filter(Boolean))
  const pinyin = normalizePinyin(lower)
  return { variants: Array.from(variants), pinyin }
}

const textIncludesAny = (value: string | undefined, variants: string[]) => {
  if (!value) return false
  const lower = value.toLowerCase()
  return variants.some((term) => term && lower.includes(term))
}

const entryScore = (entry: ZhuanEntry, term: string) => {
  const { variants, pinyin } = buildTermVariants(term)
  let score = 0
  if (textIncludesAny(entry.hanzi, variants)) score += 120

  if (pinyin) {
    const entryPy = entry.pinyin ? normalizePinyin(entry.pinyin) : ''
    if (entryPy && entryPy.startsWith(pinyin)) score += 70
  } else if (textIncludesAny(entry.pinyin, variants)) {
    score += 70
  }

  return score
}

const entryMatchesAllTerms = (entry: ZhuanEntry, terms: string[]) => {
  return terms.every((term) => entryScore(entry, term) > 0)
}

export const searchEntries = (entries: ZhuanEntry[], query: string) => {
  const terms = splitTerms(query)

  const withScores: ScoredEntry[] = entries
    .filter((e) => (terms.length === 0 ? true : entryMatchesAllTerms(e, terms)))
    .map((entry) => {
      const score =
        terms.length === 0 ? 0 : terms.reduce((acc, term) => acc + entryScore(entry, term), 0)
      return { entry, score }
    })

  withScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.entry.origin !== b.entry.origin) return a.entry.origin === 'custom' ? -1 : 1
    if (a.entry.hanzi !== b.entry.hanzi) return a.entry.hanzi.localeCompare(b.entry.hanzi, 'zh')
    return a.entry.id.localeCompare(b.entry.id)
  })

  return withScores.map((x) => x.entry)
}
