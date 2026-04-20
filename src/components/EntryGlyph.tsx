import type { ZhuanEntry } from '../types'

export const EntryGlyph = ({
  entry,
  size = 96,
  label = '小篆字形',
}: {
  entry: ZhuanEntry | null
  size?: number
  label?: string
}) => {
  const glyph = entry?.glyph

  if (!entry) {
    return (
      <div className="glyphWrap" style={{ width: size, height: size }}>
        <div className="glyphMissing">未选择</div>
      </div>
    )
  }

  if (!glyph) {
    return (
      <div className="glyphWrap" style={{ width: size, height: size }}>
        <div className="glyphFallback" aria-label={`${entry.hanzi}${label}`}>
          {entry.hanzi}
        </div>
        <div className="glyphHint">未录入</div>
      </div>
    )
  }

  if (glyph.type === 'image') {
    return (
      <div className="glyphWrap" style={{ width: size, height: size }}>
        <img className="glyphImg" src={glyph.dataUrl} alt={`${entry.hanzi}${label}`} />
      </div>
    )
  }

  if (glyph.type === 'imageUrl') {
    return (
      <div className="glyphWrap" style={{ width: size, height: size }}>
        <img className="glyphImg" src={glyph.url} alt={`${entry.hanzi}${label}`} loading="lazy" />
      </div>
    )
  }

  return (
    <div className="glyphWrap" style={{ width: size, height: size }}>
      <div
        className="glyphSvg"
        role="img"
        aria-label={`${entry.hanzi}${label}`}
        dangerouslySetInnerHTML={{ __html: glyph.svg }}
      />
    </div>
  )
}
