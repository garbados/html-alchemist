/* global document HTMLElement */
let mydocument, myElement
try {
  mydocument = document
  myElement = HTMLElement
} catch (_) {}

const isStr = s => typeof s === 'string'
const isFn = f => typeof f === 'function'
const isNum = n => typeof n === 'number'
const isNotObj = (x, HTMLElement = myElement) =>
  isStr(x) || Array.isArray(x) || x instanceof HTMLElement || isFn(x) || isNum(x) || nullish(x)
const nullish = x => [null, undefined, false].includes(x)

function appendExpr (elem, expr, document, HTMLElement) {
  const node = alchemize(expr, document, HTMLElement)
  elem.appendChild(node)
}

function elemFromExpr (expr, document = mydocument, HTMLElement = myElement) {
  let [rawtag, props, ...children] = expr
  const [subtag, ...subtags] = rawtag.split('>')
  const [idtag, id] = subtag.split('#')
  const [tag, ...classes] = idtag.split('.')
  if (isNotObj(props, HTMLElement)) {
    children = [props, ...children]
    props = {}
  }
  if (id) props.id = id
  if (classes.length) props.class = (props.class || '') + classes.join(' ')
  const rootelem = document.createElement(tag)
  let elem = rootelem
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) {
      elem[k] = v
    } else {
      elem.setAttribute(k, v)
    }
  }
  for (const subtag of subtags) {
    const subelem = elemFromExpr([subtag], document, HTMLElement)
    elem.appendChild(subelem)
    elem = subelem
  }
  for (const body of children) {
    if (nullish(body)) continue
    else if (Array.isArray(body) && !isStr(body[0])) {
      for (const subbody of body) {
        appendExpr(elem, subbody, document, HTMLElement)
      }
    } else {
      appendExpr(elem, body, document, HTMLElement)
    }
  }
  return rootelem
}

const span = (document = mydocument) => document.createElement('span')

export function alchemize (expr, document = mydocument, HTMLElement = myElement) {
  if (nullish(expr)) {
    return span(document)
  } else if (expr instanceof HTMLElement) {
    return expr
  } else if (isFn(expr)) {
    return alchemize(expr(), document, HTMLElement)
  } else if (isStr(expr)) {
    return document.createTextNode(expr)
  } else if (isNum(expr)) {
    return document.createTextNode(String(expr))
  } else if (expr.length > 0) {
    if (isStr(expr[0])) {
      return elemFromExpr(expr, document, HTMLElement)
    } else {
      const div = document.createElement('div')
      for (const subexpr of expr) {
        div.appendChild(alchemize(subexpr, document, HTMLElement))
      }
      return div
    }
  } else if (expr.length === 0) {
    return span(document)
  } else {
    throw new Error(`What? ${JSON.stringify(expr)}`)
  }
}

// insert unescaped text content
export const profane = (tagName, safeString, document = mydocument) => {
  const elem = document.createElement(tagName)
  elem.setHTMLUnsafe(safeString)
  return elem
}

// util
export const snag = (elemId, document = mydocument) =>
  document.getElementById(elemId)

export const listento = (elemId, eventName, callback, document = mydocument) =>
  snag(elemId, document).addEventListener(eventName, callback)

export const refresh = (elemId, expr, document = mydocument, HTMLElement = myElement) =>
  (
    elemId instanceof HTMLElement
      ? elemId
      : snag(elemId, document)
  ).replaceChildren(alchemize(expr, document, HTMLElement))
