import type { ZhuanEntry } from '../types'
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

export const EntryDetail = ({
  entry,
  onNavigate,
}: {
  entry: ZhuanEntry | null
  onNavigate?: (hanzi: string) => void
}) => {
  if (!entry) {
    return (
      <div className="detail">
        <div className="detailEmpty">从左侧选择一个条目查看详情。</div>
      </div>
    )
  }

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
