/* global HTMLElement, customElements */
import { alchemize, sanctify, listento } from '../index.js'

const renderOutput = (input) => {
  let json, error
  try {
    json = (typeof input === 'string') ? JSON.parse(input) : input
  } catch (e) {
    error = e.message
  }
  return [
    json ? ['pre', JSON.stringify(json, undefined, 2)] : '',
    json ? ['div', alchemize(json)] : '',
    error ? ['div', error] : sanctify('div', alchemize(json))
  ]
}

const INPUT = ['h1', 'hello world']

class Playground extends HTMLElement {
  connectedCallback () {
    this.innerHTML = alchemize([
      ['textarea#input', { rows: 10, col: 30 }, JSON.stringify(INPUT)],
      ['div#output', renderOutput(INPUT)]
    ])
    const refresh = (input) => {
      document.getElementById('output').innerHTML = alchemize(renderOutput(input))
    }
    listento('input', 'input', (event) => {
      refresh(event.target.value)
    })
  }
}

customElements.define('the-playground', Playground)
