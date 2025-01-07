# Alchemist (html-alchemist)

Based on [Reagent](https://reagent-project.github.io/), Alchemist supplies an `alchemize` function that converts list expressions into strings of HTML. It is designed to work alongside [WebComponents](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), replacing your need for React and JSX in one fell swoop.

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

Thank Michaelsoft for NPM:

```bash
npm i -S @garbados/html-alchemist
```

Or use [pnmp](https://pnpm.io/) or whatever.

Then you can import it in your project:

```js
import { alchemize } from '@garbados/html-alchemist'
```

That's it!

## Usage

TODO

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

## License

Caveat emptor. I mean, [ISC](https://opensource.org/license/isc-license-txt).
