const SELF_CLOSING_TAGS = [
  'embed',
  'img',
  'input',
  'keygen',
  'link'
]

const UNCLOSED_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'hr',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]

function makeTag (tag, body, props) {
  const prefixParts = [tag]
  for (const [prop, value] of Object.entries(props)) {
    if ([null, false, undefined].includes(value)) continue
    prefixParts.push(`${prop}="${value}"`)
  }
  const prefix = prefixParts.join(' ')
  if (UNCLOSED_TAGS.includes(tag)) {
    return `<${prefix}>`
  } else if (SELF_CLOSING_TAGS.includes(tag)) {
    return `<${prefix} />`
  } else {
    return `<${prefix}>${body}</${tag}>`
  }
}

function tagFromExpr (expr) {
  let [rawTag, maybeProps, ...rest] = expr
  let props = {}
  if (!Array.isArray(maybeProps) && typeof maybeProps === 'object') {
    props = maybeProps
  } else {
    rest = [maybeProps, ...rest]
  }
  const [maybeTag, ...rawClasses] = rawTag.split('.')
  if (rawClasses.length === 0) {
    const [tag, id] = maybeTag.split('#')
    return makeTag(tag, alchemize(rest), { id, ...props })
  } else {
    const tag = maybeTag
    const classes = rawClasses.slice(0, -1)
    const maybeID = rawClasses[rawClasses.length - 1]
    const [finalClass, id] = maybeID.split('#')
    classes.push(finalClass)
    return makeTag(tag, alchemize(rest), { id, class: classes.join(' '), ...props })
  }
}

export function alchemize (expr) {
  if (!Array.isArray(expr) && typeof expr !== 'object') {
    if (typeof expr === 'function') {
      return expr()
    } else {
      return expr
    }
  } else if (expr.length === 0) {
    return ''
  } else if (expr.length === 1) {
    return alchemize(expr[0])
  } else if (typeof expr[0] === 'string') {
    return tagFromExpr(expr)
  } else if (expr.length >= 2) {
    return expr.map(alchemize).join('')
  } else {
    throw new Error(`What? ${expr}`)
  }
}

let mydocument
try {
  mydocument = document
} catch (e) {
  console.warn(`[html-alchemist] Could not find \`document\`: ${e.message}`)
}

export const sanctify = (tagName, unsafeString, document = mydocument) => {
  if (!document) throw new Error('Missing document context. If you are not in a browser, you must pass a `document` parameter.')
  // create an enclosing node
  const enclosing = document.createElement(tagName)
  // create a text node to contain our unsafe input
  const escaped = document.createTextNode(unsafeString)
  // put one in the other
  enclosing.appendChild(escaped)
  // return the outer HTML, which includes the enclosing tag
  return enclosing.outerHTML
}

// util
export const snag = (elemId, document = mydocument) =>
  document.getElementById(elemId)

export const listento = (elemId, eventName, callback, document = mydocument) =>
  snag(elemId, document).addEventListener(eventName, callback)
