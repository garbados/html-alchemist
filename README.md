# Alchemist (html-alchemist)

Based on [Reagent](https://reagent-project.github.io/), Alchemist supplies an `alchemize` function that converts list expressions into strings of HTML. It is designed to work alongside [WebComponents](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), replacing your need for React and JSX in one fell swoop. It is very small. 859 bytes, minified, before compression.

**NOTE**: *As of this writing, Alchemist does not HTML-escape its inputs. That's **your** job.*

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

## Install

Get it on NPM:

```bash
npm i -S @garbados/html-alchemist
```

Or use [pnmp](https://pnpm.io/) or whatever.

Then you can import it in your project:

```js
import { alchemize } from '@garbados/html-alchemist'
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

## Development

Run the test suite:

```bash
npm test
```

Get test coverage info:

```bash
npm run coverage
```

Or, to mess around rendering arbitrary HTML...

```bash
# run the playground server
npm run dev
# edit playground.js
vi playground.js
# now visit http://localhost:3000
# it will update whenever index.js or playground.js change
```

You can also run `npm run release` to produce a minified version of the playground script. You can view it at `/min.html`, in case you want to see its footprint over the wire after some optimization.

## License

Caveat emptor. I mean, [ISC](https://opensource.org/license/isc-license-txt).
