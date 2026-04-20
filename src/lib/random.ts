export const pickRandom = <T>(items: T[]) => {
  if (items.length === 0) return null
  const index = Math.floor(Math.random() * items.length)
  return items[index] ?? null
}

export const pickWeightedRandom = <T>(items: T[], weightOf: (item: T) => number) => {
  if (items.length === 0) return null
  const weights = items.map((it) => Math.max(0, weightOf(it)))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return pickRandom(items)

  let cursor = Math.random() * total
  for (let i = 0; i < items.length; i += 1) {
    cursor -= weights[i] ?? 0
    if (cursor <= 0) return items[i] ?? null
  }
  return items[items.length - 1] ?? null
}

export const uniqueBy = <T, K>(items: T[], keyOf: (item: T) => K) => {
  const seen = new Set<K>()
  const out: T[] = []
  for (const item of items) {
    const key = keyOf(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

