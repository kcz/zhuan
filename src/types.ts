export type Glyph =
  | {
      type: 'svg'
      svg: string
    }
  | {
      type: 'image'
      dataUrl: string
    }
  | {
      type: 'imageUrl'
      url: string
    }

export type EntryOrigin = 'builtin' | 'custom'

export type ZhuanEntry = {
  id: string
  origin: EntryOrigin
  hanzi: string
  pinyin?: string
  meaning?: string
  freqRank?: number
  keywords: string[]
  radicals?: string
  components?: string[]
  derivatives?: string[]
  strokes?: number
  examples?: string[]
  notes?: string
  tags?: string[]
  glyph?: Glyph
  createdAt?: number
  updatedAt?: number
}

export type TabKey = 'search' | 'learn' | 'library' | 'about'

export type LearnStats = {
  known: number
  unknown: number
  lastSeenAt?: number
}

export type LearnProgress = Record<string, LearnStats>
