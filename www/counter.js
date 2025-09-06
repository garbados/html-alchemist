/* global HTMLElement, customElements */
// the example in the readme is a little more... rudimentary...

import { snag, refresh } from './alchemist.js'

function counterview () {
  let i = 0
  const id = 'counter'
  function onclick () {
    snag(id).innerText = String(++i)
  }
  return [`button#${id}`, { onclick, style: 'width: 100%;' }, i]
}

class CounterApp extends HTMLElement {
  connectedCallback () {
    refresh(this, counterview)
  }
}

customElements.define('counter-app', CounterApp)
