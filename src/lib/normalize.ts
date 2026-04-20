export const normalizeText = (value: string) => {
  return value.trim().toLowerCase()
}

export const normalizePinyin = (value: string) => {
  let s = value.trim().toLowerCase()
  if (!s) return ''
  s = s.replaceAll('u:', 'v').replaceAll('ü', 'v')
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  s = s.replace(/[1-5]/g, '')
  s = s.replace(/[^a-zv]+/g, '')
  return s
}

export const splitTerms = (query: string) => {
  const normalized = normalizeText(query)
  if (!normalized) return []
  return normalized.split(/\s+/).filter(Boolean)
}
