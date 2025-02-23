/* global HTMLElement, customElements */
import { alchemize } from './alchemist.js'

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
      document.getElementById('output').replaceChildren(alchemize(renderOutput(event.target.value)))
    }
    const view = alchemize([
      ['textarea', { rows: 10, col: 30, oninput }, JSON.stringify(INPUT)],
      ['div#output', renderOutput(INPUT)]
    ])
    this.replaceChildren(view)
  }
}

customElements.define('playground-app', PlaygroundApp)
