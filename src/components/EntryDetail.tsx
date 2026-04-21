import { useState } from 'react'
import type { ZhuanEntry } from '../types'
import { readJson, writeJson } from '../lib/storage'
import builtinExtraMeaningsRaw from '../data/builtinExtraMeanings.json'
import { EntryGlyph } from './EntryGlyph'

const Field = ({ label, value }: { label: string; value: string | undefined }) => {
  if (!value) return null
  return (
    <div className="field">
      <div className="fieldLabel">{label}</div>
      <div className="fieldValue">{value}</div>
    </div>
  )
}

const FieldList = ({
  label,
  items,
  onPick,
}: {
  label: string
  items: string[] | undefined
  onPick?: (value: string) => void
}) => {
  if (!items?.length) return null
  return (
    <div className="field">
      <div className="fieldLabel">{label}</div>
      <div className={onPick ? 'fieldValue fieldValueWrap' : 'fieldValue'}>
        {onPick
          ? items.map((x) => (
              <button key={x} type="button" className="chipLink" onClick={() => onPick(x)}>
                {x}
              </button>
            ))
          : items.join('、')}
      </div>
    </div>
  )
}

type EntryAnnotations = Record<string, { extraMeaning?: string }>

const EXTRA_MEANING_KEY = 'zhuan-learn.entryExtraMeaning.v1'

const builtinExtraMeanings = builtinExtraMeaningsRaw as Record<string, string>

export const EntryDetail = ({
  entry,
  onNavigate,
}: {
  entry: ZhuanEntry | null
  onNavigate?: (hanzi: string) => void
}) => {
  const [annotations, setAnnotations] = useState<EntryAnnotations>(() => {
    return readJson<EntryAnnotations>(EXTRA_MEANING_KEY) ?? {}
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  if (!entry) {
    return (
      <div className="detail">
        <div className="detailEmpty">从左侧选择一个条目查看详情。</div>
      </div>
    )
  }

  const localOverride = typeof annotations[entry.id]?.extraMeaning === 'string' ? annotations[entry.id]!.extraMeaning! : ''
  const hasLocalOverride = Boolean(localOverride.trim())
  const builtinMeaning = typeof builtinExtraMeanings[entry.hanzi] === 'string' ? builtinExtraMeanings[entry.hanzi]! : ''
  const effectiveMeaning = localOverride.trim() ? localOverride : builtinMeaning
  const isEditing = editingId === entry.id

  return (
    <div className="detail">
      <div className="detailHeader">
        <EntryGlyph entry={entry} size={160} />
        <div className="detailHeaderMain">
          <div className="detailTitle">
            <span className="detailHanzi">{entry.hanzi}</span>
            {entry.pinyin ? <span className="detailPinyin">{entry.pinyin}</span> : null}
            {entry.origin === 'custom' ? <span className="tag tagCustom">自定义</span> : null}
          </div>
          {entry.meaning ? <div className="detailMeaning">{entry.meaning}</div> : null}
          <div className="detailExtra">
            <div className="field fieldVertical">
              <div className="fieldLabel">释义</div>
              <div className="fieldValue">
                {isEditing ? (
                  <div>
                    <textarea
                      className="textarea"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="补充你对这个字的释义/用法/引申等（仅保存在本地）"
                      rows={4}
                    />
                    <div className="fieldActions">
                      <button
                        type="button"
                        className="btnPrimary"
                        onClick={() => {
                          const next = draft.trim()
                          const updated: EntryAnnotations = { ...annotations }
                          if (next) updated[entry.id] = { extraMeaning: next }
                          else delete updated[entry.id]
                          setAnnotations(updated)
                          writeJson(EXTRA_MEANING_KEY, updated)
                          setEditingId(null)
                        }}
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditingId(null)
                        }}
                      >
                        取消
                      </button>
                      {hasLocalOverride ? (
                        <button
                          type="button"
                          className="btnDanger"
                          onClick={() => {
                            const updated: EntryAnnotations = { ...annotations }
                            delete updated[entry.id]
                            setAnnotations(updated)
                            writeJson(EXTRA_MEANING_KEY, updated)
                            setEditingId(null)
                          }}
                        >
                          清除
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div>
                    {effectiveMeaning ? <div>{effectiveMeaning}</div> : <span className="muted">暂无</span>}
                    <div className="fieldActions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setDraft(effectiveMeaning)
                          setEditingId(entry.id)
                        }}
                      >
                        {effectiveMeaning ? '编辑释义' : '新增释义'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="detailBody">
        <Field label="部首" value={entry.radicals} />
        <FieldList label="子部件" items={entry.components} onPick={onNavigate} />
        <FieldList label="衍生字" items={entry.derivatives} onPick={onNavigate} />
        <Field label="笔画" value={typeof entry.strokes === 'number' ? String(entry.strokes) : undefined} />
        {entry.examples?.length ? (
          <div className="field">
            <div className="fieldLabel">例词</div>
            <div className="fieldValue">
              <ul className="examples">
                {entry.examples.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
