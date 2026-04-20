const allowedTags = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'title',
])

const allowedAttributes = new Set([
  'xmlns',
  'viewBox',
  'width',
  'height',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'opacity',
  'transform',
  'd',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'points',
  'offset',
  'stop-color',
  'stop-opacity',
])

const sanitizeElement = (el: Element) => {
  const tag = el.tagName
  if (!allowedTags.has(tag)) {
    el.remove()
    return
  }

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name
    const value = attr.value

    if (name.toLowerCase().startsWith('on')) {
      el.removeAttribute(name)
      continue
    }
    if (!allowedAttributes.has(name)) {
      el.removeAttribute(name)
      continue
    }
    if (typeof value === 'string' && value.toLowerCase().includes('javascript:')) {
      el.removeAttribute(name)
      continue
    }
  }

  for (const child of Array.from(el.children)) sanitizeElement(child)
}

export const sanitizeSvg = (rawSvg: string) => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(rawSvg, 'image/svg+xml')

    const svg = doc.documentElement
    if (!svg || svg.tagName !== 'svg') return ''

    sanitizeElement(svg)

    const serializer = new XMLSerializer()
    return serializer.serializeToString(svg)
  } catch {
    return ''
  }
}

