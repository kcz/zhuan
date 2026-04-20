import type { ZhuanEntry } from '../types'
import { EntryGlyph } from './EntryGlyph'

export const EntryListItem = ({ entry }: { entry: ZhuanEntry }) => {
  const displayKeywords = entry.keywords.filter((k) => !/^部首:\d+$/.test(k))

  return (
    <div className="listItem">
      <div className="listItemLeft">
        <EntryGlyph entry={entry} size={54} />
      </div>
      <div className="listItemMain">
        <div className="listItemTitle">
          <span className="hanzi">{entry.hanzi}</span>
          {entry.pinyin ? <span className="pinyin">{entry.pinyin}</span> : null}
          {entry.origin === 'custom' ? <span className="tag tagCustom">自定义</span> : null}
        </div>
        {entry.meaning ? <div className="meaning">{entry.meaning}</div> : null}
        {displayKeywords.length ? (
          <div className="keywords">{displayKeywords.slice(0, 6).join(' · ')}</div>
        ) : null}
      </div>
    </div>
  )
}
