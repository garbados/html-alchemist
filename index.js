function makeTag (tag, body, props) {
  const prefixParts = [`<${tag}`]
  for (const [prop, value] of Object.entries(props)) {
    if ([null, false, undefined].includes(value)) continue
    prefixParts.push(`${prop}="${value}"`)
  }
  prefixParts.push('>')
  const prefix = prefixParts.join(' ')
  return `${prefix}${body}</${tag}>`
}

function tagFromExpr (expr) {
  let [rawTag, maybeOptions, ...rest] = expr
  let options = {}
  if (!Array.isArray(maybeOptions) && typeof maybeOptions === 'object') {
    options = maybeOptions
  } else {
    rest = [maybeOptions, ...rest]
  }
  const [maybeTag, ...rawClasses] = rawTag.split('.')
  if (rawClasses.length === 0) {
    const [tag, id] = maybeTag.split('#')
    return makeTag(tag, alchemize(rest), { id, ...options })
  } else {
    const tag = maybeTag
    const classes = rawClasses.slice(0, -1)
    const maybeID = rawClasses[rawClasses.length - 1]
    const [finalClass, id] = maybeID.split('#')
    classes.push(finalClass)
    return makeTag(tag, alchemize(rest), { id, class: classes.join(' '), ...options })
  }
}

export function alchemize (expr) {
  if (!Array.isArray(expr)) {
    if (typeof expr === 'function') {
      return expr()
    } else {
      return expr
    }
  } else if (expr.length === 1) {
    return alchemize(expr[0])
  } else if (expr.length >= 2) {
    if (typeof expr[0] === 'string') {
      return tagFromExpr(expr)
    } else {
      return expr.map(alchemize).join('')
    }
  } else {
    throw new Error(`What? ${expr}`)
  }
}
