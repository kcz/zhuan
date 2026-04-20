import { useMemo, useState } from 'react'
import type { UpsertInput, ZhuanLibraryApi } from '../hooks/useZhuanLibrary'
import type { Glyph, ZhuanEntry } from '../types'
import { searchEntries } from '../lib/search'
import { sanitizeSvg } from '../lib/sanitizeSvg'
import { EntryGlyph } from './EntryGlyph'

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const emptyDraft = (): UpsertInput => ({
  hanzi: '',
  pinyin: '',
  meaning: '',
  keywords: [],
  notes: '',
  examples: [],
  radicals: '',
  tags: [],
  glyph: undefined,
})

const parseCommaList = (value: string) =>
  value
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean)

export const LibraryPanel = ({
  library,
  builtinEntries,
}: {
  library: ZhuanLibraryApi
  builtinEntries: ZhuanEntry[]
}) => {
  const [tab, setTab] = useState<'custom' | 'builtin'>('custom')
  const [editorMode, setEditorMode] = useState<'hidden' | 'new' | 'edit'>('hidden')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [draft, setDraft] = useState<UpsertInput>(() => emptyDraft())
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState<{ imported: number; rejected: number } | null>(
    null,
  )
  const [builtinQuery, setBuiltinQuery] = useState('')

  const selected = useMemo(() => {
    if (!selectedId) return null
    return library.customEntries.find((e) => e.id === selectedId) ?? null
  }, [library.customEntries, selectedId])

  const startNew = () => {
    setSelectedId(null)
    setDraft(emptyDraft())
    setEditorMode('new')
  }

  const startEdit = (entry: ZhuanEntry) => {
    setSelectedId(entry.id)
    setDraft({
      id: entry.id,
      hanzi: entry.hanzi,
      pinyin: entry.pinyin ?? '',
      meaning: entry.meaning ?? '',
      keywords: entry.keywords ?? [],
      radicals: entry.radicals ?? '',
      strokes: entry.strokes,
      examples: entry.examples ?? [],
      notes: entry.notes ?? '',
      tags: entry.tags ?? [],
      glyph: entry.glyph,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })
    setEditorMode('edit')
  }

  const save = () => {
    if (!draft.hanzi.trim()) return
    const next = !draft.keywords?.length
      ? library.upsert({ ...draft, keywords: [draft.hanzi.trim()] })
      : library.upsert(draft)
    setSelectedId(next.id)
    setEditorMode('edit')
  }

  const remove = () => {
    if (!selectedId) return
    library.remove(selectedId)
    setSelectedId(null)
    setDraft(emptyDraft())
    setEditorMode('hidden')
  }

  const handleImport = () => {
    const result = library.importJson(importText)
    setImportResult(result)
  }

  const handleReset = () => {
    library.reset()
    setSelectedId(null)
    setDraft(emptyDraft())
    setImportText('')
    setImportResult(null)
    setEditorMode('hidden')
    setShowImport(false)
  }

  const onUpload = async (file: File) => {
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const text = await file.text()
      const cleaned = sanitizeSvg(text)
      setDraft((d) => ({
        ...d,
        glyph: cleaned ? ({ type: 'svg', svg: cleaned } satisfies Glyph) : undefined,
      }))
      return
    }

    if (file.type.startsWith('image/')) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('读取失败'))
        reader.onload = () => resolve(String(reader.result))
        reader.readAsDataURL(file)
      })
      setDraft((d) => ({ ...d, glyph: { type: 'image', dataUrl } }))
    }
  }

  const builtinResults = useMemo(() => {
    return searchEntries(builtinEntries, builtinQuery)
  }, [builtinEntries, builtinQuery])

  const builtinVisible = useMemo(() => {
    const trimmed = builtinQuery.trim()
    if (!trimmed) return builtinResults.slice(0, 200)
    return builtinResults
  }, [builtinQuery, builtinResults])

  return (
    <div>
      {/* Tab switcher */}
      <div className="libraryTabs" role="tablist" aria-label="字库标签页">
        <button
          type="button"
          className={tab === 'custom' ? 'btnPrimary' : 'btn'}
          onClick={() => setTab('custom')}
        >
          自定义字库
        </button>
        <button
          type="button"
          className={tab === 'builtin' ? 'btnPrimary' : 'btn'}
          onClick={() => setTab('builtin')}
        >
          内置字库（只读）
        </button>
      </div>

      {tab === 'custom' ? (
        <div className="libraryLayout">
          {/* Left: entry list */}
          <section className="panel">
            <div className="panelHeader">
              <div className="panelHeaderLeft">
                <div className="panelHeaderTitle">自定义字库</div>
                {library.customEntries.length > 0 && (
                  <span className="pill">{library.customEntries.length} 条</span>
                )}
              </div>
              <div className="panelHeaderActions">
                <button className="btnPrimary" type="button" onClick={startNew}>
                  ＋ 新建
                </button>
                <div className="btnDivider" />
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setShowImport((v) => !v)
                    setImportResult(null)
                  }}
                  aria-pressed={showImport}
                >
                  {showImport ? '收起' : '↑ 导入'}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => downloadText('zhuan-custom-entries.json', library.exportJson())}
                >
                  ↓ 导出
                </button>
              </div>
            </div>

            {/* Import drawer — appears above the list */}
            {showImport ? (
              <div className="libraryImportDrawer">
                <div className="libraryImportDrawerActions">
                  <button className="btnPrimary" type="button" onClick={handleImport}>
                    导入 JSON
                  </button>
                  <button className="btnDanger" type="button" onClick={handleReset}>
                    清空字库
                  </button>
                  {importResult ? (
                    <span className="importResult">
                      成功 {importResult.imported} 条，拒绝 {importResult.rejected} 条
                    </span>
                  ) : null}
                </div>
                <input
                  className="input"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    void file.text().then((text) => {
                      setImportText(text)
                      setImportResult(null)
                    })
                    e.currentTarget.value = ''
                  }}
                />
                <textarea
                  className="textarea"
                  rows={6}
                  placeholder="或直接粘贴之前导出的 JSON 数组"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
              </div>
            ) : null}

            <div className="libraryList">
              {library.customEntries.length === 0 ? (
                <div className="empty">暂无自定义条目，点击「＋ 新建」开始录入。</div>
              ) : null}
              {library.customEntries.map((e) => (
                <button
                  key={e.id}
                  className={e.id === selectedId ? 'libraryItem active' : 'libraryItem'}
                  type="button"
                  onClick={() => startEdit(e)}
                >
                  <EntryGlyph entry={e} size={44} />
                  <div className="libraryItemMain">
                    <div className="libraryItemTitle">
                      <span className="hanzi">{e.hanzi}</span>
                      {e.pinyin ? <span className="pinyin">{e.pinyin}</span> : null}
                    </div>
                    {e.meaning ? <div className="meaning">{e.meaning}</div> : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Right: editor */}
          <div className="libraryRight">
            {editorMode === 'hidden' ? (
              <section className="panel">
                <div className="panelHeader">
                  <div className="panelHeaderLeft">
                    <div className="panelHeaderTitle">编辑</div>
                  </div>
                  <div className="panelHeaderActions">
                    <button className="btnPrimary" type="button" onClick={startNew}>
                      ＋ 新建条目
                    </button>
                  </div>
                </div>
                <div className="empty">从左侧选择一个条目进行编辑，或点击「＋ 新建条目」。</div>
              </section>
            ) : (
              <section className="panel">
                <div className="panelHeader">
                  <div className="panelHeaderLeft">
                    <div className="panelHeaderTitle">
                      {editorMode === 'edit' && selected ? '编辑条目' : '新建条目'}
                    </div>
                  </div>
                  <div className="panelHeaderActions">
                    <button className="btnPrimary" type="button" onClick={save}>
                      保存
                    </button>
                    <button
                      className="btnDanger"
                      type="button"
                      onClick={remove}
                      disabled={editorMode !== 'edit' || !selectedId}
                    >
                      删除
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setSelectedId(null)
                        setDraft(emptyDraft())
                        setEditorMode('hidden')
                      }}
                    >
                      关闭
                    </button>
                  </div>
                </div>

                <div className="form">
                  <div className="formRow">
                    <label className="label">
                      汉字
                      <input
                        className="input"
                        value={draft.hanzi}
                        onChange={(e) => setDraft((d) => ({ ...d, hanzi: e.target.value }))}
                        placeholder="例如：山"
                      />
                    </label>
                    <label className="label">
                      拼音
                      <input
                        className="input"
                        value={draft.pinyin ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, pinyin: e.target.value }))}
                        placeholder="例如：shān"
                      />
                    </label>
                  </div>

                  <div className="formRow">
                    <label className="label grow">
                      释义
                      <input
                        className="input"
                        value={draft.meaning ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, meaning: e.target.value }))}
                        placeholder="一句话解释即可"
                      />
                    </label>
                  </div>

                  <div className="formRow">
                    <label className="label grow">
                      关键词（逗号分隔）
                      <input
                        className="input"
                        value={(draft.keywords ?? []).join('，')}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, keywords: parseCommaList(e.target.value) }))
                        }
                        placeholder="例如：山，山岳，地形"
                      />
                    </label>
                  </div>

                  <div className="formRow">
                    <label className="label">
                      部首
                      <input
                        className="input"
                        value={draft.radicals ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, radicals: e.target.value }))}
                      />
                    </label>
                    <label className="label">
                      笔画
                      <input
                        className="input"
                        type="number"
                        value={typeof draft.strokes === 'number' ? draft.strokes : ''}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            strokes: e.target.value ? Number(e.target.value) : undefined,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="formRow">
                    <label className="label grow">
                      例词（每行一个）
                      <textarea
                        className="textarea"
                        value={(draft.examples ?? []).join('\n')}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, examples: e.target.value.split('\n') }))
                        }
                        rows={3}
                      />
                    </label>
                  </div>

                  <div className="formRow">
                    <label className="label grow">
                      备注
                      <textarea
                        className="textarea"
                        value={draft.notes ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                        rows={4}
                      />
                    </label>
                  </div>

                  <div className="formRow">
                    <label className="label grow">
                      标签（逗号分隔）
                      <input
                        className="input"
                        value={(draft.tags ?? []).join('，')}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, tags: parseCommaList(e.target.value) }))
                        }
                      />
                    </label>
                  </div>

                  <div className="formRow">
                    <label className="label grow">
                      字形（上传 SVG / PNG / JPG）
                      <input
                        className="input"
                        type="file"
                        accept=".svg,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          void onUpload(file)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>

                  <div className="formRow">
                    <div className="preview">
                      <div className="previewTitle">预览</div>
                      <EntryGlyph
                        entry={
                          draft.hanzi
                            ? ({ ...(draft as ZhuanEntry), id: 'draft', origin: 'custom' } as ZhuanEntry)
                            : null
                        }
                        size={160}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'builtin' ? (
        <div className="libraryBuiltin">
          <section className="panel">
            <div className="panelHeader">
              <div className="panelHeaderLeft">
                <div className="panelHeaderTitle">内置字库（只读）</div>
                <span className="pill">共 {builtinEntries.length} 条</span>
              </div>
            </div>
            <div className="importBox">
              <input
                className="input"
                value={builtinQuery}
                onChange={(e) => setBuiltinQuery(e.target.value)}
                placeholder="按汉字 / 拼音搜索内置字库"
              />
            </div>
            <div className="libraryList">
              {builtinVisible.map((e) => (
                <div key={e.id} className="builtinRow">
                  <EntryGlyph entry={e} size={44} />
                  <div className="libraryItemMain">
                    <div className="libraryItemTitle">
                      <span className="hanzi">{e.hanzi}</span>
                      {e.pinyin ? <span className="pinyin">{e.pinyin}</span> : null}
                    </div>
                    {e.meaning ? <div className="meaning">{e.meaning}</div> : null}
                  </div>
                </div>
              ))}
              {!builtinQuery.trim() && builtinResults.length > 200 ? (
                <div className="notice">为空查询仅展示前 200 条，请输入关键词缩小范围</div>
              ) : null}
              {builtinResults.length === 0 ? <div className="empty">没有匹配结果。</div> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
