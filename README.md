# Alchemist (html-alchemist)

[![Build and Test](https://github.com/garbados/html-alchemist/actions/workflows/test.yml/badge.svg)](https://github.com/garbados/html-alchemist/actions/workflows/test.yml)
[![Coverage Status](https://coveralls.io/repos/github/garbados/html-alchemist/badge.svg?branch=main)](https://coveralls.io/github/garbados/html-alchemist?branch=main)

Based on [Reagent](https://reagent-project.github.io/), Alchemist supplies an `alchemize` function that converts list expressions into strings of HTML. It is designed to work alongside [WebComponents](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), replacing your need for React and JSX in one fell swoop. It is very small. About 3 kb, unminified, uncompressed.

Example:

```js
alchemize([
  'section.section',
  ['h1', 'Calendar of the Witchmothers'],
  ['hr', ''],
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
class YourElement extends HTMLElement {
  async connectedCallback () {
    this.innerHTML = alchemize(...)
  }

  // ... and so on
}
```

Alchemist supplies an HTML encoding function
for alchemizing untrusted inputs, named `sanctify`.
Be sure to use it when you need it!

```js
// UNSAFE: CODE INJECTIONS AHOY!
this.innerHTML = alchemize(['div', userInput])
// <div><h1>hello world</h1></div>

// SAFE: NOT THIS TIME, HACKER!!
this.innerHTML = sanctify('div', userInput)
// <div>&lt;h1&gt;hello world&lt;/h1&gt;</div>
```

There are several example apps you can check out on [the website](https://garbados.github.io/html-alchemist), including todo and diary apps. You may find the [playground](https://garbados.github.io/html-alchemist/playground) especially good for experimentation.

## Install

Get it on NPM:

```bash
npm i -S html-alchemist
```

Or use [pnmp](https://pnpm.io/) or whatever.

Then you can import it in your project:

```js
import { alchemize, sanctify } from 'html-alchemist'
```

## Usage

Alchemist uses a list-based approach to structuring HTML. It's already a list of lists, and who likes writing end tags?

Your basic expression is a list of two things. The first is a string, and is interpreted as the node's HTML tag. The second is used as the node's content, and may be another alchemical expression.

```js
alchemize(['h1', 'hello world'])
// <h1>hello world</h1>
```

To add properties to the tag, follow the tag name with an object. Its keys and values will be translated into properties.

```js
alchemize(['input', { type: 'text' }])
// <input type="text" />
```

Tag names follow a special syntax that allows you to define classes and IDs without entering them as properties, the same way Reagent does.

```js
alchemize(['input.my-input-style#signup-form-username', { type: 'text' }])
// <input id="signup-form-username" class="my-input-style" type="text" />
```

Practically speaking, you can use IDs to add event listeners to `<input />` nodes produced by Alchemist.

```js
const node = document.getElementById('signup-form-username')
node.addEventListener('input', (event) => {
  // fires whenever the input's value changes
})
```

In turn, you can nest functions in alchemical expressions to execute when `alchemize` is called.

```js
alchemize(['div.welcome', () => 'bonjour!'])
// <div class="welcome">bonjour!</div>
```

*This doesn't work on promises. Sorry.* You'll have to deal with the hassle of event listeners instead.

Inputs that aren't lists can be either strings, which will be returned unchanged, or functions, which will be called and returned.

```js
alchemize('hello!')
// hello!
alchemize(() => 'bonjour!')
// bonjour!
```

Inputs of length 0 return an empty string.

```js
alchemize([])
// ''
```

Inputs of length 1 are pulled from their list and recursed.

```js
alchemize(['hr'])
// hr
```

To actually get a tag to parse into HTML, the input must be of length 2 or greater:

```js
alchemize(['hr', ''])
// <hr />
```

Alchemist tries to be smart about what tags are self-closed or unclosed, but to be parsed into an HTML node, even self-closing or unclosed tags must come in a list longer than length 1. Therefore, it is customary to express them with an empty string as the second value. *This is a major difference from Reagent's syntax.*

Also unlike Reagent, inputs do not strictly need to begin with an HTML tag name. You could have a list of elements, and they would be evaluated as siblings.

```js
alchemize(['div.content', [['h1', 'have you heard the good word'], ['p', 'the word is "bird"']]])
// <div class="content"><h1>have you heard the good word</h1><p>the word is "bird"</p></div>
```

You could also make them peers of the tag, without a list in the middle. It's up to you.

```js
alchemize(['div.content', ['h1', 'have you heard the good word'], ['p', 'the word is "bird"']])
// <div class="content"><h1>have you heard the good word</h1><p>the word is "bird"</p></div>
```

That's it. Now you know alchemy.

### Escaping Unsafe Inputs

To prevent code injection, Alchemist exports `sanctify`,
a function to escape HTML in untrusted strings.
Rather than providing an alchemical expression,
you provide an enclosing tag, with the text to escape.

```js
const userBlogPost = 'Dear diary, today I became a <script> tag.'
sanctify('p', userBlogPost)
// <p>Dear diary, today I became a &lt;script&gt; tag.</p>
```

Because `sanctify` returns a string, you can use it inside of alchemical expressions:

```js
alchemize([
  ['h1', sanctify(userBlogTitle)],
  ['p', sanctify(userBlogPost)]
])
```

For more advanced HTML sanitization situations,
like allowing some tags and not others,
check out [@jitbit/htmlsanitizer](https://github.com/jitbit/HtmlSanitizer).

Sanctify relies on the `document` object in a browser's context,
so using it outside of the browser will require passing your own `document`,
such as with [jsdom](https://github.com/jsdom/jsdom).

### Convenience

Not to play code golf about it, but sometimes I like typing fewer characters. Alchemist also exports these functions:

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

Or, to mess around rendering arbitrary HTML...

```bash
# run the playground server
npm run dev
# edit a recipe
emacs recipes/playground.js
# now visit http://localhost:3000/playground
# it will update whenever any recipes change
```

You can also run `npm run minsize` to stat a minified version of the source script:

```bash
npm run minsize

  File: index.min.js
  Size: 1484            Blocks: 8          IO Block: 4096   regular file
  ...
```

## License

Caveat emptor. I mean, [ISC](https://opensource.org/license/isc-license-txt).
