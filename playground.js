import { alchemize } from './index.js'

const input = [
  // put your alchemy here
  ['h1', 'hello world']
]

class Playground extends HTMLElement {
  connectedCallback () {
    this.innerHTML = alchemize(input)
  }
}

customElements.define('the-playground', Playground)
