import type { ZhuanEntry } from '../types'

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">${body}</svg>`

export const fallbackBuiltinEntries: ZhuanEntry[] = [
  {
    id: 'b:shan',
    origin: 'builtin',
    hanzi: '山',
    pinyin: 'shān',
    meaning: '山岳；高起的地形。',
    keywords: ['山', '山岳', '地形', '自然'],
    glyph: {
      type: 'svg',
      svg: svg(
        `<path d="M40 135V50m40 85V30m40 105V55" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
         <path d="M30 135H130" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`,
      ),
    },
    notes: '内置演示字形为示意图，用于展示流程；建议在「字库」页替换为你认可的字形。',
    tags: ['示例'],
  },
  {
    id: 'b:shui',
    origin: 'builtin',
    hanzi: '水',
    pinyin: 'shuǐ',
    meaning: '水；液体。',
    keywords: ['水', '液体', '自然'],
    glyph: {
      type: 'svg',
      svg: svg(
        `<path d="M80 25v110" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
         <path d="M55 70c-18 18-18 34 0 52" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
         <path d="M105 70c18 18 18 34 0 52" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`,
      ),
    },
    notes: '示意字形：以竖与两侧曲线体现“水流”。',
    tags: ['示例'],
  },
  {
    id: 'b:ri',
    origin: 'builtin',
    hanzi: '日',
    pinyin: 'rì',
    meaning: '太阳；白天；日子。',
    keywords: ['日', '太阳', '时间'],
    glyph: {
      type: 'svg',
      svg: svg(
        `<rect x="40" y="32" width="80" height="96" rx="12" fill="none" stroke="currentColor" stroke-width="10"/>
         <path d="M55 80H105" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`,
      ),
    },
    notes: '示意字形：用围框与中横表达“日”。',
    tags: ['示例'],
  },
  {
    id: 'b:yue',
    origin: 'builtin',
    hanzi: '月',
    pinyin: 'yuè',
    meaning: '月亮；月份。',
    keywords: ['月', '月亮', '时间'],
    glyph: {
      type: 'svg',
      svg: svg(
        `<path d="M55 28v104" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
         <path d="M55 30c58 12 58 88 0 100" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
         <path d="M70 68h40M70 96h40" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`,
      ),
    },
    notes: '示意字形：以弧形体现“月”。',
    tags: ['示例'],
  },
  {
    id: 'b:mu',
    origin: 'builtin',
    hanzi: '木',
    pinyin: 'mù',
    meaning: '树木；木材。',
    keywords: ['木', '树', '木材', '自然'],
    glyph: {
      type: 'svg',
      svg: svg(
        `<path d="M80 25v110" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
         <path d="M40 65h80" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
         <path d="M54 132l26-36 26 36" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,
      ),
    },
    notes: '示意字形：用“十”与根部表现“木”。',
    tags: ['示例'],
  },
]

