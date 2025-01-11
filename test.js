/* global describe, it */
import { alchemize, sanctify } from './index.js'
import * as fc from 'fast-check'
import { HtmlValidate, formatterFactory } from 'html-validate'
import { HTML_TAGS } from './constants.js'
import * as assert from 'assert/strict'

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
// validator
const validator = new HtmlValidate({
  extends: ['html-validate:recommended']
})
const textFormatResult = formatterFactory('text')
const htmlTagGen = () => fc.constantFrom(...TEST_HTML_TAGS)
const contentGen = () => fc.stringMatching(/^[^&"<>]+$/)
const attrGen = () => fc.stringMatching(/^[a-z-]+$/)
const attrsGen = () => fc.dictionary(attrGen(), attrGen())

const { tree: alchemishProp } = fc.letrec((tie) => {
  return {
    tree: fc.oneof({ depthSize: 'small', withCrossShrink: true }, tie('leaf'), tie('node')),
    node: tie('leaf'),
    leaf: fc.oneof(
      htmlTagGen(),
      fc.tuple(),
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

describe('html-alchemist', function () {
  it('should produce valid html from every (tested) tag', function () {
    const errors = TEST_HTML_TAGS.map((tag) => {
      return validator.validateStringSync(alchemize([tag, '']))
    }).filter((validation) => {
      return !validation.valid
    }).map((validation) => {
      return textFormatResult(validation.results).split(/\n+/g)[0]
    }).toSorted()
    for (const error of errors) {
      console.log(error)
    }
    assert.strictEqual(errors.length, 0)
  })

  it('should at least not error on every known tag', function () {
    for (const tag of HTML_TAGS) {
      // just don't error, ok?
      alchemize([tag, ''])
    }
  })

  it('handles classes and IDs', function () {
    const a = alchemize(['div.foo', ''])
    assert.strictEqual(a, '<div class="foo"></div>')
    const b = alchemize(['div.foo#bar', ''])
    assert.strictEqual(b, '<div id="bar" class="foo"></div>')
  })

  it('should handle values that are functions', function () {
    const a = alchemize(['div', () => 'hello'])
    assert.strictEqual(a, '<div>hello</div>')
  })

  it('should handle arbitrary inputs', function () {
    fc.assert(
      fc.property(
        alchemishProp,
        (alchemish) => {
          if (Array.isArray(alchemish) && alchemish.length === 3) {
            delete alchemish[1].constructor // html-validate gets mad when an attr is named constructor
          }
          const validation = validator.validateStringSync(alchemize(alchemish))
          if (!validation.valid) {
            console.log(textFormatResult(validation.results))
          }
          return validation.valid
        }
      )
    )
  })

  it('should error when it does not understand', function () {
    const expected = 'What?'
    try {
      alchemize([{ foo: 'bar' }, ''])
      throw new Error('Nope.')
    } catch (e) {
      assert.strictEqual(e.message.slice(0, expected.length), expected)
    }
  })

  it('should sanitize inputs when asked to', function () {
    const children = []
    const sanitizeHtml = (s) => {
      return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }
    const fakedocument = {
      createElement (tagName) {
        return {
          appendChild (child) {
            children.push(child)
          },
          get outerHTML () {
            return alchemize([tagName, children.join('')])
          }
        }
      },
      createTextNode (unsafeString) {
        return sanitizeHtml(unsafeString)
      }
    }
    const unsafeInput = '<h1>hello world</h1>'
    const expected = `<p>${sanitizeHtml(unsafeInput)}</p>`
    const actual = sanctify('p', unsafeInput, fakedocument)
    assert.strictEqual(expected, actual, `Mismatch: ${actual} actual; expected: ${expected}`)
  })
})
