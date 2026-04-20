import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EntryDetail } from './components/EntryDetail'
import { EntryListItem } from './components/EntryListItem'
import { LibraryPanel } from './components/LibraryPanel'
import { useBuiltinEntries } from './hooks/useBuiltinEntries'
import { useZhuanLibrary } from './hooks/useZhuanLibrary'
import { searchEntries } from './lib/search'
import type { TabKey } from './types'
import { LearnPage } from './pages/LearnPage'
import { Logo } from './components/Logo'

const pinyinToneRank = (pinyin: string | undefined) => {
  if (!pinyin) return 5
  const s = pinyin.trim()
  if (!s) return 5
  const digit = s.match(/[1-5]/)?.[0]
  if (digit) return Number(digit)

  const tone1 = 'āēīōūǖĀĒĪŌŪǕ'
  const tone2 = 'áéíóúǘÁÉÍÓÚǗ'
  const tone3 = 'ǎěǐǒǔǚǍĚǏǑǓǙ'
  const tone4 = 'àèìòùǜÀÈÌÒÙǛ'

  for (const ch of s) {
    if (tone1.includes(ch)) return 1
    if (tone2.includes(ch)) return 2
    if (tone3.includes(ch)) return 3
    if (tone4.includes(ch)) return 4
  }

  return 5
}

const pinyinToneStripped = (pinyin: string | undefined) => {
  if (!pinyin) return ''
  return pinyin
    .trim()
    .toLowerCase()
    .replaceAll('u:', 'v')
    .replaceAll('ü', 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[1-5]/g, '')
    .replace(/[^a-zv]+/g, '')
}

function App() {
  const initialQuery = (() => {
    try {
      const q = new URLSearchParams(window.location.search).get('q')
      return q?.trim() ? q : ''
    } catch {
      return ''
    }
  })()

  const [tab, setTab] = useState<TabKey>('search')
  const [query, setQuery] = useState(initialQuery)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const listLimit = 200

  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const builtin = useBuiltinEntries()
  const library = useZhuanLibrary()

  useEffect(() => {
    document.title = '篆'
  }, [])

  const updateQueryAndUrl = useCallback((nextQuery: string, options?: { push?: boolean }) => {
    setQuery(nextQuery)
    try {
      const params = new URLSearchParams(window.location.search)
      const trimmed = nextQuery.trim()
      if (!trimmed) params.delete('q')
      else params.set('q', trimmed)
      const nextSearch = params.toString()
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
      if (options?.push) window.history.pushState(null, '', nextUrl)
      else window.history.replaceState(null, '', nextUrl)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const onPopState = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const q = params.get('q')
        setQuery(q?.trim() ?? '')
        setSelectedId(null)
      } catch {
        // ignore
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const allEntries = useMemo(() => {
    return [...builtin.entries, ...library.customEntries]
  }, [builtin.entries, library.customEntries])

  const results = useMemo(() => {
    return searchEntries(allEntries, query)
  }, [allEntries, query])

  const pinyinCollator = useMemo(() => {
    try {
      return new Intl.Collator('zh-u-co-pinyin')
    } catch {
      return new Intl.Collator('zh')
    }
  }, [])

  const sortedResults = useMemo(() => {
    const trimmed = query.trim()
    const items = [...results]
    items.sort((a, b) => {
      if (a.origin !== b.origin) return a.origin === 'custom' ? -1 : 1

      if (trimmed) {
        const ar = a.freqRank ?? Number.POSITIVE_INFINITY
        const br = b.freqRank ?? Number.POSITIVE_INFINITY
        if (ar !== br) return ar - br
      }

      const at = pinyinToneRank(a.pinyin)
      const bt = pinyinToneRank(b.pinyin)
      if (at !== bt) return at - bt

      const ap = pinyinToneStripped(a.pinyin)
      const bp = pinyinToneStripped(b.pinyin)
      if (ap && bp && ap !== bp) return ap < bp ? -1 : 1

      const r = pinyinCollator.compare(a.hanzi, b.hanzi)
      if (r !== 0) return r
      return a.hanzi.localeCompare(b.hanzi, 'zh')
    })
    return items
  }, [pinyinCollator, query, results])

  const visibleResults = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return sortedResults.slice(0, listLimit)
    return sortedResults
  }, [listLimit, query, sortedResults])

  const selectedEntry = useMemo(() => {
    const id = selectedId ?? visibleResults[0]?.id ?? null
    if (!id) return null
    return allEntries.find((e) => e.id === id) ?? null
  }, [allEntries, selectedId, visibleResults])

  const navigateToHanzi = useCallback(
    (hanzi: string) => {
      const nextQuery = hanzi.trim()
      if (!nextQuery) return
      updateQueryAndUrl(nextQuery, { push: true })
      const nextResults = searchEntries(allEntries, nextQuery)
      const nextId = nextResults[0]?.id ?? null
      setSelectedId(nextId)
    },
    [allEntries, updateQueryAndUrl],
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo
            onClick={() => {
              setTab('search')
              updateQueryAndUrl('', { push: true })
              setSelectedId(null)
            }}
          />
        </div>
        <nav className="tabs" aria-label="主导航">
          <button
            className={tab === 'search' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('search')}
            type="button"
          >
            查询
          </button>
          <button
            className={tab === 'learn' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('learn')}
            type="button"
          >
            学习
          </button>
          <button
            className={tab === 'library' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('library')}
            type="button"
          >
            字库
          </button>
          <button
            className={tab === 'about' ? 'tab tabActive' : 'tab'}
            onClick={() => setTab('about')}
            type="button"
          >
            使用说明
          </button>
        </nav>
      </header>

      {tab === 'search' ? (
        <main className="layout">
          <section className="panel">
            <div className="searchBar">
              <div className="searchInputWrap">
                <input
                  ref={searchInputRef}
                  className="searchInput"
                  value={query}
                  onChange={(e) => updateQueryAndUrl(e.target.value)}
                  placeholder="输入：汉字 / 拼音"
                  aria-label="搜索"
                />
                {query.trim() ? (
                  <button
                    type="button"
                    className="clearBtn"
                    aria-label="清空搜索"
                    onClick={() => {
                      updateQueryAndUrl('', { push: true })
                      setSelectedId(null)
                      searchInputRef.current?.focus()
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <div className="searchMetaRow">
                <div className="searchMetaRight">
                  <span className="pill">
                    共 {allEntries.length} 条
                  </span>
                </div>
              </div>
              {builtin.error ? (
                <div className="notice noticeError">
                  内置字库加载失败（{builtin.error}），当前使用演示字库
                </div>
              ) : null}
            </div>

            <div className="list" role="list">
              {builtin.isLoading && !query.trim() && library.customEntries.length === 0 ? (
                <div className="loadingBlock">
                  <div className="loadingTitle">正在加载内置字库…</div>
                  <div className="loadingLine" />
                  <div className="loadingLine" />
                  <div className="loadingLine" />
                  <div className="loadingLine" />
                  <div className="loadingLine" />
                </div>
              ) : null}
              {visibleResults.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={entry.id === selectedEntry?.id ? 'listBtn active' : 'listBtn'}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <EntryListItem entry={entry} />
                </button>
              ))}
              {!query.trim() && results.length > listLimit ? (
                <div className="notice">为空查询仅展示前 {listLimit} 条，请输入关键词缩小范围</div>
              ) : null}
              {results.length === 0 && !builtin.isLoading ? (
                <div className="empty">
                  没有匹配结果。你可以到「字库」页添加自定义条目，或尝试换个关键词。
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel detailPanel">
            {builtin.isLoading && !selectedEntry ? (
              <div className="detail">
                <div className="detailEmpty">字库加载中…</div>
              </div>
            ) : (
              <EntryDetail entry={selectedEntry} onNavigate={navigateToHanzi} />
            )}
          </section>
        </main>
      ) : null}

      {tab === 'learn' ? (
        <main className="layoutSingle">
          <LearnPage entries={allEntries} />
        </main>
      ) : null}

      {tab === 'library' ? (
        <main className="layoutSingle">
          <LibraryPanel library={library} builtinEntries={builtin.entries} />
        </main>
      ) : null}

      {tab === 'about' ? (
        <main className="layoutSingle">
          <section className="panel">
            <h2 className="h2">你可以用它做什么</h2>
            <ul className="ul">
              <li>查询：按汉字 / 拼音 / 释义关键词检索条目，查看小篆字形与笔记。</li>
              <li>学习：闪卡与四选一测验，按“认识/不认识”自动加权复习。</li>
              <li>字库：录入你自己的小篆字形（SVG/PNG），并导入/导出 JSON。</li>
            </ul>
            <h2 className="h2">数据说明</h2>
            <ul className="ul">
              <li>内置字库从 public/library/builtin.json 加载（可用 npm run sync:zhuan 重新生成）。</li>
              <li>自定义条目只保存在浏览器本地（localStorage），不上传服务器。</li>
              <li>SVG 会在导入与上传时进行基础净化，避免脚本与事件属性。</li>
            </ul>
            <h2 className="h2">参考来源</h2>
            <ul className="ul">
              <li>中研院「小學堂小篆」：收录小篆字头 9831 个、字形 11101 个。</li>
              <li>GitHub：Splend1d/Zhuan 项目（以「小學堂小篆」为来源整理数据）。</li>
            </ul>
          </section>
        </main>
      ) : null}
    </div>
  )
}

export default App
