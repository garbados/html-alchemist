/* global HTMLElement, customElements */
import { alchemize } from './index'

const INPUT = [
  // put your alchemy here
  ['h1', 'hello world']
]

class Playground extends HTMLElement {
  connectedCallback () {
    this.innerHTML = alchemize(INPUT)
  }
}

customElements.define('the-playground', Playground)
