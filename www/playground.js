/* global HTMLElement, customElements */
import { alchemize, refresh } from './alchemist.js'

const renderOutput = (input) => {
  let json, error, result
  try {
    json = (typeof input === 'string') ? JSON.parse(input) : input
    result = alchemize(json)
  } catch (e) {
    error = e.message
  }
  if (error) {
    return ['div', error]
  } else {
    return [
      ['p', 'Parsed:'],
      ['pre', JSON.stringify(json, undefined, 2)],
      ['p', 'Escaped:'],
      ['article', result.outerHTML],
      ['p', 'Rendered:'],
      ['article', result]
    ]
  }
}

const INPUT = ['h1', 'hello world']

class PlaygroundApp extends HTMLElement {
  connectedCallback () {
    const oninput = (event) => {
      refresh('output', renderOutput(event.target.value))
    }
    refresh(this, [
      ['textarea', { rows: 10, col: 30, oninput }, JSON.stringify(INPUT)],
      ['div#output', renderOutput(INPUT)]
    ])
  }
}

customElements.define('playground-app', PlaygroundApp)
