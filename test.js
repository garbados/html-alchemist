/* global describe, it */
import { alchemize, listento, snag, profane, refresh } from './index.js'
import * as fc from 'fast-check'
import * as assert from 'assert/strict'
import { HtmlValidate, formatterFactory } from 'html-validate'
import { JSDOM } from 'jsdom'

// an incomplete list of valid html tags.
// you can help by expanding it
const HTML_TAGS = [
  'a',
  'abbr',
  'address',
  'annotation-xml',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  // "bgsound", // deprecated
  // "big", // deprecated
  // "blink", // deprecated, thank god
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  // 'center', // deprecated
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  // 'dir', // deprecated
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  // 'font', // deprecated
  'font-face',
  'font-face-format',
  'font-face-name',
  'font-face-src',
  'font-face-uri',
  'footer',
  'form',
  // 'frame', // deprecated
  // 'frameset', // deprecated
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  // 'keygen', // deprecated
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  // 'marquee', // deprecated, unfortunately
  'math',
  'menu',
  'meta',
  'meter',
  'missing-glyph',
  'nav',
  // 'nobr', // deprecated
  // 'noembed', // deprecated
  // 'noframes', // deprecated
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  // 'plaintext', // deprecated
  'pre',
  'progress',
  'q',
  'rb',
  'rp',
  'rt',
  'rtc',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'slot',
  'small',
  'source',
  // 'spacer', // deprecated
  'span',
  // 'strike', // deprecated
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'svg',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  // 'tt', // deprecated
  'u',
  'ul',
  'var',
  'video',
  'wbr'
  // 'xmp' // deprecated
]

// some tags are hard to test so lol don't
const WEIRD_TAGS = [
  'a',
  'abbr',
  'address',
  'area',
  'aside',
  'b',
  'base',
  'bdi',
  'bdo',
  'body',
  'button',
  'dd',
  'details',
  'dl',
  'dt',
  'embed',
  'fieldset',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'html',
  'iframe',
  'img',
  'input',
  'link',
  'main',
  'map',
  'nav',
  'object',
  'section',
  'th',
  'title'
]

const TEST_HTML_TAGS = HTML_TAGS.filter(s => !WEIRD_TAGS.includes(s))

const validator = new HtmlValidate({ extends: ['html-validate:recommended'] })
const textFormatResult = formatterFactory('text')

const htmlTagGen = () => fc.constantFrom(...TEST_HTML_TAGS)
const contentGen = () => fc.stringMatching(/^[^&"<>]+$/)
const attrGen = () => fc.stringMatching(/^[a-z][a-z-]*$/)
const attrsGen = () => fc.dictionary(attrGen(), attrGen())

const { tree: alchemishProp } = fc.letrec((tie) => {
  return {
    tree: fc.oneof({ depthSize: 'small', withCrossShrink: true }, tie('leaf'), tie('node')),
    node: tie('leaf'),
    leaf: fc.oneof(
      fc.constantFrom(null, false, undefined),
      fc.tuple(),
      fc.tuple(
        htmlTagGen()
      ),
      fc.tuple(
        htmlTagGen(),
        contentGen()
      ),
      fc.tuple(
        htmlTagGen(),
        attrsGen(),
        contentGen()
      )
    )
  }
})

const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')

describe('html-alchemist', function () {
  it('should handle values that are functions', function () {
    const a = alchemize(() => ['div', () => 'hello'], window.document, window.HTMLElement)
    assert.strictEqual(a.outerHTML, '<div>hello</div>')
  })

  it('should handle some basic inputs', function () {
    const potion = alchemize([
      'section.container#main>div.content.box',
      { special: 'something' },
      ['h1.title', 'hello world'],
      ['p.subtitle', 'lead to gold']
    ], window.document, window.HTMLElement)
    assert.strictEqual(potion.localName, 'section')
    assert.strictEqual(potion.id, 'main')
    assert.strictEqual(potion.className, 'container')
    assert.strictEqual(potion.children[0].getAttribute('special'), 'something') // props go on final element in tag list
    assert.strictEqual(potion.children[0].localName, 'div')
    assert.strictEqual(potion.children[0].id, '')
    assert.strictEqual(potion.children[0].className, 'content box')
    assert.strictEqual(potion.children[0].children[0].className, 'title')
    assert.strictEqual(potion.children[0].children[0].id, '')
    assert.strictEqual(potion.children[0].children[0].localName, 'h1')
    assert.strictEqual(potion.children[0].children[0].innerHTML, 'hello world')
    assert.strictEqual(potion.children[0].children[1].className, 'subtitle')
    assert.strictEqual(potion.children[0].children[1].id, '')
    assert.strictEqual(potion.children[0].children[1].localName, 'p')
    assert.strictEqual(potion.children[0].children[1].innerHTML, 'lead to gold')
  })

  it('should handle being given actual html entities', function () {
    const potion = alchemize(alchemize(['h1', 'hello world'], window.document, window.HTMLElement), window.document, window.HTMLElement)
    assert.strictEqual(potion.outerHTML, '<h1>hello world</h1>')
  })

  it('should handle being given numerical content', function () {
    const potion = alchemize(['h1', 1], window.document, window.HTMLElement)
    assert.strictEqual(potion.outerHTML, '<h1>1</h1>')
  })

  it('should handle being given bare siblings', function () {
    const potion = alchemize([['p', 'hello'], ['p', 'world']], window.document, window.HTMLElement)
    assert.strictEqual(potion.outerHTML, '<div><p>hello</p><p>world</p></div>')
  })

  it('should handle being given bare sub-children', function () {
    const potion = alchemize(['div', [['p', 'hello'], ['p', 'world']]], window.document, window.HTMLElement)
    assert.strictEqual(potion.outerHTML, '<div><p>hello</p><p>world</p></div>')
  })

  it('should handle lists with falsy elements', function () {
    const potion = alchemize(['ul', ['li', 'hello'], null], window.document, window.HTMLElement)
    assert.strictEqual(potion.outerHTML, '<ul><li>hello</li></ul>')
  })

  it('should set handlers OK', function () {
    const potion = alchemize(['button', { onclick: () => {} }, 'hello world'], window.document, window.HTMLElement)
    assert.strictEqual(potion.outerHTML, '<button>hello world</button>')
    assert.strict(typeof potion.onclick === 'function')
  })

  it('should assign props to last sub-element', function () {
    const potion = alchemize(['p>span', { id: 'ok' }, 'hello world'], window.document, window.HTMLElement)
    assert.strictEqual(potion.outerHTML, '<p><span id="ok">hello world</span></p>')
  })

  it('should handle arbitrary inputs', function () {
    this.timeout(10 * 1000)
    fc.assert(
      fc.property(
        alchemishProp,
        (alchemish) => {
          if (Array.isArray(alchemish) && alchemish.length === 3) {
            delete alchemish[1].constructor // html-validate gets mad when an attr is named constructor
          }
          const potion = alchemize(alchemish, window.document, window.HTMLElement)
          const validation = validator.validateStringSync(potion.outerHTML)
          if (!validation.valid) {
            console.log(textFormatResult(validation.results))
          }
          return validation.valid
        }
      )
    )
  })

  it('should error when it does not understand', function () {
    const input = { foo: 'bar' }
    const expected = `What? ${JSON.stringify(input)}`
    try {
      alchemize([input, ''], window.document, window.HTMLElement)
      throw new Error('Nope.')
    } catch (e) {
      assert.strictEqual(e.message, expected, e.message)
    }
  })

  it('should profane inputs when asked to', function () {
    const fakedocument = {
      createElement (localName) {
        let html = `<${localName}></${localName}>`
        return {
          get outerHTML () {
            return html
          },
          setHTMLUnsafe (s) {
            html = `<${localName}>${s}</${localName}>`
          }
        }
      }
    }
    const unsafeInput = '<h1>hello world</h1>'
    const actual = profane('p', unsafeInput, fakedocument)
    const expected = `<p>${unsafeInput}</p>`
    assert.strictEqual(expected, actual.outerHTML, `Mismatch: ${actual.outerHTML} actual; expected: ${expected}`)
  })

  describe('utils', function () {
    const fakedocument = {
      createTextNode (x) {
        return x
      },
      getElementById () {
        return {
          addEventListener (eventName, callback) {
            callback(eventName)
          },
          replaceChildren (potion) {
            if (typeof potion === 'function') {
              return potion()
            } else {
              return potion
            }
          }
        }
      }
    }

    it('snag', function () {
      assert.ok(snag('???', fakedocument))
    })

    it('listento', async function () {
      const id = '???'
      const text = '?!?!?!?!'
      const eventName = await new Promise((resolve) => {
        listento(id, text, resolve, fakedocument)
      })
      assert.strictEqual(text, eventName)
    })

    it('refresh', function () {
      const expr = 'aaa'
      assert.strictEqual(expr, refresh('???', () => expr, fakedocument, window.HTMLElement))
      const elem = fakedocument.getElementById()
      assert.strictEqual(expr, refresh(elem, () => expr, fakedocument, elem.constructor))
    })
  })
})
