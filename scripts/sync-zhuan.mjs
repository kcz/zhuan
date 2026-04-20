import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pinyin } from 'pinyin-pro'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'public', 'library')
const OUT_FILE = path.join(OUT_DIR, 'builtin.json')

const urls = {
  main: 'https://raw.githubusercontent.com/Splend1d/Zhuan/master/assets/db/main.json',
  freq: 'https://raw.githubusercontent.com/Splend1d/Zhuan/master/assets/db/freq100000.json',
  treeChild: 'https://raw.githubusercontent.com/Splend1d/Zhuan/master/assets/db/treechild.json',
  treeParent: 'https://raw.githubusercontent.com/Splend1d/Zhuan/master/assets/db/treeparent.json',
}

const localCachePaths = {
  main: path.join(ROOT, 'data-cache', 'main.json'),
  freq: path.join(ROOT, 'data-cache', 'freq100000.json'),
  treeChild: path.join(ROOT, 'data-cache', 'treechild.json'),
  treeParent: path.join(ROOT, 'data-cache', 'treeparent.json'),
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const fetchWithRetry = async (url, { retries = 4, timeoutMs = 120_000 } = {}) => {
  let lastError = null
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) throw new Error(`fetch failed: ${url} (${res.status})`)
      return res
    } catch (e) {
      lastError = e
      const backoff = Math.min(15_000, 500 * 2 ** (attempt - 1))
      console.warn(`Fetch failed (attempt ${attempt}/${retries}): ${url}`)
      if (attempt < retries) await sleep(backoff)
    }
  }
  throw lastError ?? new Error(`fetch failed: ${url}`)
}

const exists = async (filePath) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const readLocalJson = async (filePath) => {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

const fetchJson = async (url, localCachePath) => {
  if (localCachePath && (await exists(localCachePath))) {
    console.log(`Using local cache: ${path.relative(ROOT, localCachePath)}`)
    return await readLocalJson(localCachePath)
  }
  const res = await fetchWithRetry(url)
  return await res.json()
}

const hexToChar = (hex) => {
  const codePoint = Number.parseInt(hex, 16)
  if (!Number.isFinite(codePoint)) return ''
  return String.fromCodePoint(codePoint)
}

const guessHanziFromFontCode = (fontCode) => {
  if (typeof fontCode !== 'string') return ''
  const parts = fontCode.split('.')
  const hex = parts[1]
  if (!hex) return ''
  return hexToChar(hex)
}

const pickBestHanzi = (record) => {
  const han = record?.han
  if (Array.isArray(han) && typeof han[0] === 'string' && han[0].trim()) return han[0].trim()
  const fonts = record?.fonts
  if (Array.isArray(fonts) && Array.isArray(fonts[0]) && typeof fonts[0][0] === 'string') {
    return guessHanziFromFontCode(fonts[0][0])
  }
  return ''
}

const pickZhuanFontCode = (record) => {
  const fonts = record?.fonts
  if (!Array.isArray(fonts)) return null

  for (const group of fonts) {
    if (!Array.isArray(group)) continue
    const found = group.find((x) => typeof x === 'string' && x.startsWith('27.'))
    if (typeof found === 'string') return found
  }

  const firstGroup = fonts[0]
  if (Array.isArray(firstGroup) && typeof firstGroup[0] === 'string') return firstGroup[0]
  return null
}

const unique = (items) => Array.from(new Set(items))

const toPinyin = (hanzi) => {
  try {
    const value = pinyin(hanzi, { toneType: 'symbol', nonZh: 'removed' })
    if (typeof value !== 'string') return undefined
    const first = value.split('|')[0]?.trim()
    return first ? first : undefined
  } catch {
    return undefined
  }
}

const toEntry = (id, record, ctx) => {
  const { mainDb, treeChild, treeParent, codeToHanzi, freqRankById } = ctx
  const hanzi = pickBestHanzi(record)
  if (!hanzi) return null

  const meaning = typeof record.meaning === 'string' ? record.meaning : undefined
  const pinyinValue = toPinyin(hanzi)
  const zhuanFontCode = pickZhuanFontCode(record)
  const glyphUrl = zhuanFontCode
    ? `https://raw.githubusercontent.com/Splend1d/Zhuan/master/assets/db/img/${zhuanFontCode}.png`
    : null

  const keywords = [hanzi, '小篆', '说文']
  if (typeof record.major === 'string' && record.major) keywords.push(`部首:${record.major}`)

  const radical = (() => {
    const majorId = typeof record.major === 'string' ? record.major : null
    if (!majorId) return undefined
    const majorRecord = mainDb[majorId]
    const majorHanzi = pickBestHanzi(majorRecord)
    return majorHanzi || undefined
  })()

  const components = (() => {
    if (!zhuanFontCode) return undefined
    const codes = Array.isArray(treeChild[zhuanFontCode]) ? treeChild[zhuanFontCode] : []
    const list = codes
      .filter((code) => code !== zhuanFontCode)
      .map((code) => codeToHanzi.get(code))
      .filter(Boolean)
    const result = unique(list)
    return result.length ? result.slice(0, 20) : undefined
  })()

  const derivatives = (() => {
    if (!zhuanFontCode) return undefined
    const codes = Array.isArray(treeParent[zhuanFontCode]) ? treeParent[zhuanFontCode] : []
    const list = codes
      .filter((code) => code !== zhuanFontCode)
      .map((code) => codeToHanzi.get(code))
      .filter(Boolean)
    const result = unique(list)
    return result.length ? result.slice(0, 40) : undefined
  })()

  return {
    id: `zhuan:${id}`,
    origin: 'builtin',
    hanzi,
    pinyin: pinyinValue,
    meaning,
    freqRank: freqRankById.get(String(id)),
    radicals: radical,
    components,
    derivatives,
    keywords,
    notes: '来源参考：中研院「小學堂小篆」资料库；由 Splend1d/Zhuan 项目整理生成。',
    tags: ['小學堂小篆', 'Zhuan', '说文'],
    glyph: glyphUrl ? { type: 'imageUrl', url: glyphUrl } : undefined,
  }
}

const main = async () => {
  console.log('Downloading datasets...')
  const [mainDb, freq, treeChild, treeParent] = await Promise.all([
    fetchJson(urls.main, localCachePaths.main),
    fetchJson(urls.freq, localCachePaths.freq),
    fetchJson(urls.treeChild, localCachePaths.treeChild),
    fetchJson(urls.treeParent, localCachePaths.treeParent),
  ])

  if (!mainDb || typeof mainDb !== 'object') throw new Error('main.json invalid')
  if (!Array.isArray(freq)) throw new Error('freq100000.json invalid')
  if (!treeChild || typeof treeChild !== 'object') throw new Error('treechild.json invalid')
  if (!treeParent || typeof treeParent !== 'object') throw new Error('treeparent.json invalid')

  const freqRankById = new Map()
  for (let i = 0; i < freq.length; i += 1) {
    const id = freq[i]
    if (typeof id !== 'string') continue
    if (!freqRankById.has(id)) freqRankById.set(id, i + 1)
  }

  const codeToHanzi = new Map()
  for (const record of Object.values(mainDb)) {
    const hanzi = pickBestHanzi(record)
    if (!hanzi) continue
    const fonts = record?.fonts
    if (!Array.isArray(fonts)) continue
    for (const group of fonts) {
      if (!Array.isArray(group)) continue
      for (const code of group) {
        if (typeof code === 'string' && code.startsWith('27.') && !codeToHanzi.has(code)) {
          codeToHanzi.set(code, hanzi)
        }
      }
    }
  }

  const allIds = Object.keys(mainDb)
  console.log(`Building full entries (${allIds.length})...`)
  const entries = []
  for (const key of allIds) {
    const record = mainDb[key]
    const entry = toEntry(key, record, { mainDb, treeChild, treeParent, codeToHanzi, freqRankById })
    if (entry) entries.push(entry)
  }

  entries.sort((a, b) => a.hanzi.localeCompare(b.hanzi, 'zh'))

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(entries, null, 2), 'utf8')
  console.log(`Wrote ${entries.length} entries to ${path.relative(ROOT, OUT_FILE)}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
