/* global HTMLElement, customElements */

import { alchemize, snag } from './alchemist.js'

function counterview () {
  let i = 0
  function onclick () {
    snag('counter').innerText = String(++i)
  }
  return alchemize(['button#counter', { onclick, style: 'width: 100%;' }, i])
}

class CounterApp extends HTMLElement {
  connectedCallback () {
    this.appendChild(counterview())
  }
}

customElements.define('counter-app', CounterApp)
