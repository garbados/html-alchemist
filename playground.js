/* global HTMLElement, customElements */
import { alchemize, sanctify } from './index'

const INPUT = [
  // put your alchemy here
  ['h1', 'hello world']
]

class Playground extends HTMLElement {
  connectedCallback () {
    this.innerHTML = alchemize(['div', INPUT])
    this.innerHTML += sanctify('div', alchemize(INPUT))
  }
}

customElements.define('the-playground', Playground)
