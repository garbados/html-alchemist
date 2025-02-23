/* global document HTMLElement */
let mydocument, myElement
try {
  mydocument = document
  myElement = HTMLElement
} catch (_) {}

const isStr = s => typeof s === 'string'
const isFn = f => typeof f === 'function'
const isNum = n => typeof n === 'number'
const nullish = x => [null, undefined, false].includes(x)

function elemFromExpr (expr, document = mydocument, HTMLElement = myElement) {
  let [rawtag, props, ...children] = expr
  const [subtag, ...subtags] = rawtag.split('>')
  const [idtag, id] = subtag.split('#')
  const [tag, ...classes] = idtag.split('.')
  if (isStr(props) || Array.isArray(props) || props instanceof HTMLElement || isFn(props) || isNum(props) || nullish(props)) {
    children = [props, ...children]
    props = {}
  }
  const rootelem = document.createElement(tag)
  let elem = rootelem
  if (id) elem.setAttribute('id', id)
  if (classes.length) elem.setAttribute('class', classes.join(' '))
  for (const subtag of subtags) {
    const subelem = elemFromExpr([subtag], document, HTMLElement)
    elem.appendChild(subelem)
    elem = subelem
  }
  Object.entries(props || {}).forEach(([k, v]) => { k.startsWith('on') ? elem[k] = v : elem.setAttribute(k, v) })
  for (const body of children) {
    if (nullish(body)) continue
    const node = alchemize(body, document, HTMLElement)
    elem.appendChild(node)
  }
  return rootelem
}

export function alchemize (expr, document = mydocument, HTMLElement = myElement) {
  if (!Array.isArray(expr)) {
    if (expr instanceof HTMLElement) {
      return expr
    } else if (isFn(expr)) {
      return alchemize(expr(), document, HTMLElement)
    } else if (isStr(expr)) {
      return document.createTextNode(expr)
    } else if (isNum(expr)) {
      return document.createTextNode(String(expr))
    } else {
      throw new Error(`What? ${expr}`)
    }
  } else {
    if (expr.length === 0) {
      return document.createElement('span')
    } else {
      if (isStr(expr[0])) {
        return elemFromExpr(expr, document, HTMLElement)
      } else {
        const div = document.createElement('div')
        for (const elem of expr.map((x) => alchemize(x, document, HTMLElement))) {
          div.appendChild(elem)
        }
        return div
      }
    }
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
