# Alchemist (html-alchemist)

[![NPM Version](https://badge.fury.io/js/html-alchemist.svg)](https://badge.fury.io/js/html-alchemist)
[![Build and Test](https://github.com/garbados/html-alchemist/actions/workflows/test.yml/badge.svg)](https://github.com/garbados/html-alchemist/actions/workflows/test.yml)
[![Coverage Status](https://coveralls.io/repos/github/garbados/html-alchemist/badge.svg?branch=main)](https://coveralls.io/github/garbados/html-alchemist?branch=main)

Based on [Reagent](https://reagent-project.github.io/), Alchemist supplies an `alchemize` function that converts list expressions into HTML entities. It is designed to work alongside [WebComponents](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), replacing your need for React and JSX in one fell swoop. It is very small. About 1.0kB, once minified and gzipped. Its closest cousin is [VanJS](https://vanjs.org/).

Example:

```js
alchemize([
  'section.section',
  ['h1', 'Calendar of the Witchmothers'],
  ['hr'],
  ['ul',
      ['li', explainSeason(witchy)],
      ['li', explainPhase(witchy)],
      ['li', explainMonth(witchy)],
      ['li', explainTime(witchy)]
  ],
  holidays
      ? [['h2', 'Holidays'],
          ['hr', ''],
          ['ul', holidays.map(h => ['li', h])]]
      : ''
])
/*
<section class="section">
  <h1>Calendar of the Witchmothers</h1>
  <hr>
  <ul>
    <li>It is day 11 of Winter; 77 til Spring.</li>
    <li>It is day 7 of the New Moon; Waxing happens in 33% of a day, or 1/6/2025, 3:56:25 PM.</li>
    <li>It is day 7 of the Jester's Moon; 22 til the Wizard's.</li>
    <li>The current time is 0:21:25, or 8:01:43 AM.</li>
  </ul>
</section>
*/
```

(src: [witch-clock](https://github.com/garbados/witch-clock))

Using it alongside WebComponents is simple:

```js
import { alchemize, snag } from "./alchemist.js"

function counterview () {
  // no reactive state. you control when and what to re-render.
  let i = 0
  function onclick () {
    // interact directly with the DOM. dispel the magic.
    snag('counter').innerText = String(++i)
  }
  // stop writing end tags. set attributes tersely.
  return alchemize(['button#counter', { onclick, style: 'width: 100%;' }, i])
}

// forget react. make your own elements with webcomponents.
class CounterApp extends HTMLElement {
  connectedCallback () {
    this.appendChild(counterview())
  }
}

customElements.define('counter-app', CounterApp)
```

Text input is HTML-escaped by default.
Alchemist supplies a function called `profane`
for alchemizing trusted inputs, like parsed Markdown.
Be sure to use it when you need it!

```js
// SAFE: NOT THIS TIME, HACKER!!
this.replaceChildren(alchemize(['div', userInput]))
// <div>&lt;h1&gt;hello world&lt;/h1&gt;</div>

// UNSAFE: CODE INJECTIONS AHOY!
this.replaceChildren(profane('div', userInput))
// <div><h1>hello world</h1></div>
```

There are several example apps you can check out on [the website](https://garbados.github.io/html-alchemist), including todo and diary apps. You may find the playground especially useful for experimentation.

## Install

Get it on NPM:

```bash
npm i -S html-alchemist
```

Or use [pnmp](https://pnpm.io/) or whatever.

Then you can import it in your project:

```js
import { alchemize } from 'html-alchemist'
```

## Usage

Alchemist uses a list-based approach to structuring HTML. It's already a list of lists, and who likes writing end tags?

Your most basic expression is a list with one element, which is used as the name of an HTML tag:

```js
alchemize(['hr'])
// <hr>
```

To add content to a node, you need a list of two things. The first is the node's HTML tag. The second is used as the node's content, and may be another alchemical expression.

```js
alchemize(['h1', 'hello world'])
// <h1>hello world</h1>
```

To add properties to the tag, follow the tag name with an object. Its keys and values will be translated into properties.

```js
alchemize(['button', { onclick: () => { ... } }, 'Click me!'])
// <button onclick="...">Click me!</button>
```

Tag names follow a special syntax that allows you to define classes and IDs without entering them as properties, the same way Reagent does.

```js
alchemize(['input.my-input-style#signup-form-username', { type: 'text' }])
// <input id="signup-form-username" class="my-input-style" type="text" />
```

You can also notate direct descendents, such as for nested style semantics.

```js
alchemize(['main.container>section>article#content', 'Hello world!'])
// <main class="container"><section><article id="content"></article></section></main>
```

Because Alchemist produces normal HTML entities, you can query them and add event listeners using browser-standard APIs.

```js
const node = document.getElementById('signup-form-username')
node.addEventListener('input', (event) => {
  // fires whenever the input's value changes
})
```

Of course, you can also pass event handlers directly in alchemical expressions:

```js
let i = 0
function onclick () {
  document.getElementById('counter').innerText = String(++i)
}
return alchemize(['button#counter', { onclick }, i])
```

You can also nest functions in alchemical expressions to execute when `alchemize` is called.

```js
alchemize(['div.welcome', () => 'bonjour!'])
// <div class="welcome">bonjour!</div>
```

*This doesn't work on promises. Sorry.* You'll have to deal with the hassle of event listeners instead.

Inputs that aren't lists can be either strings, which will be converted to HTML text nodes, or functions, which will be called and alchemized.

```js
alchemize('hello!')
// #text hello!
alchemize(() => 'bonjour!')
// #text bonjour!
```

Inputs of length 0 return an empty span.

```js
alchemize([])
// <span></span>
```

Unlike Reagent, inputs do not strictly need to begin with an HTML tag name. Without an explicit tag name, `div` is used.

```js
alchemize(['div.content', [['h1', 'have you heard the good word'], ['p', 'the word is "bird"']]])
// <div class="content"><div><h1>have you heard the good word</h1><p>the word is "bird"</p></div></div>
```

You could also make them peers of the tag, without a list in the middle. It's up to you.

```js
alchemize(['div.content', ['h1', 'have you heard the good word'], ['p', 'the word is "bird"']])
// <div class="content"><h1>have you heard the good word</h1><p>the word is "bird"</p></div>
```

That's it. Now you know alchemy.

### Allowing Unsafe Inputs

To allow code injection, Alchemist exports `profane`,
a function to ignore escaping HTML in untrusted strings.
Rather than providing an alchemical expression,
you provide an enclosing tag, with the text to escape.

```js
const userBlogPost = 'Dear diary, today I became a <script> tag.'
profane('p', userBlogPost)
// <p>Dear diary, today I became a <script> tag.</p>
```

### Convenience

Sometimes I like typing fewer characters. Alchemist also exports these functions:

- `snag(elemId)`: equivalent to `document.getElementById(elemId)`
- `listento(elemId, eventName, callback)`: equivalent to `snag(elemId).addEventListener(eventName, callback)`

## Development

Run the test suite:

```bash
npm test
```

Get test coverage info:

```bash
npm run cov
```

To modify the main site:

```bash
# run the playground server
npm run dev
# edit a recipe
emacs www/playground.js
# now visit http://localhost:3000/
# it will update whenever alchemist or any recipes change
```

## License

Caveat emptor. I mean, [ISC](https://opensource.org/license/isc-license-txt).
