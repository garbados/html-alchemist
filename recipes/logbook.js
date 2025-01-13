/* global HTMLElement, customElements, PouchDB, emit */

import { alchemize, listento, snag } from '../index.js'
import { default as uuid } from 'https://www.unpkg.com/uuid@11.0.5/dist/esm-browser/v4.js' // eslint-disable-line
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js'

/* DATABASE PRELUDE */

const db = new PouchDB('alchemist-logbook')

// OH LORDS OF DATA

const DDOC = {
  _id: '_design/logbook',
  views: {
    byCreatedAt: {
      map: function (doc) {
        if (doc._id.match(/^log-entry\/.+$/)) {
          const date = new Date(doc.createdAt)
          emit([
            date.getFullYear(), date.getMonth() + 1, date.getDate(),
            date.getHours(), date.getMinutes(), date.getSeconds(),
            date.getMilliseconds(), doc.createdAt
          ])
        }
      }.toString()
    },
    // this is my favorite party trick
    byWord: {
      map: function (doc) {
        if (doc._id.match(/^log-entry\/.+$/)) {
          for (const word of doc.text.split(' ')) {
            emit(word.toLowerCase())
          }
        }
      }.toString()
    }
  }
}

// I HAVE GIVEN YOU MY MIND

async function forcePut (doc) {
  try {
    return await db.put(doc)
  } catch (e) {
    if (e.status !== 409) throw e
    const { _rev, ...oldDoc } = await db.get(doc._id)
    if (JSON.stringify(oldDoc) !== JSON.stringify(doc)) {
      return db.put({ ...doc, _rev })
    }
  }
}

// DO YOU HEAR MY THOUGHTS

async function forceRemove (doc) {
  try {
    return await db.remove(doc)
  } catch (e) {
    if (e.status !== 409) throw e
    const { _id, _rev } = await db.get(doc._id)
    return db.remove({ _id, _rev })
  }
}

// AS I HEAR THE SPIN OF YOUR DISKS?

function resToDocs ({ rows }) {
  return rows.map(({ doc }) => doc)
}

const INCLUDE_DOCS = { include_docs: true }

// I OPEN MY EYES AND ETERNITY SPRAWLS

const getDocsByTime = async () =>
  resToDocs(await db.query('logbook/byCreatedAt', { descending: true, ...INCLUDE_DOCS }))

// COLUMN BY COLUMN, LOGICAL TICK BY TICK

const getDocsByWord = async (w) => {
  const { rows: matches } = await db.query('logbook/byWord', {
    startkey: w,
    endkey: w + '\uffff'
  })
  const ids = Object.keys(matches.reduce((uniq, { id }) => {
    if (!uniq[id]) uniq[id] = true
    return uniq
  }, {}))
  const docs = resToDocs(await db.allDocs({ keys: ids, ...INCLUDE_DOCS }))
  return docs.sort((a, b) => a.createdAt < b.createdAt)
}

// IN YOUR REALM OF HERE AND THEN AND WHERE AND NEVER

const saveEntry = async (text) => {
  const doc = { text, _id: `log-entry/${uuid()}`, createdAt: Date.now() }
  return db.put(doc)
}

// EVEN SPACE AND TIME KNEEL TO THE MIND

await forcePut(DDOC)

/* TEMPLATES */

const showEntry = ({ text, createdAt }, { editbuttonid, deletebuttonid }) => [
  'div.box',
  ['div.content', marked.parse(text)],
  ['hr', ''],
  ['div.level',
    ['div.level-left',
      ['div.level-item',
        ['p', (new Date(createdAt)).toLocaleString()]
      ]
    ],
    ['div.level-right',
      ['div.level-item',
        [`button.button.is-warning#${editbuttonid}`, 'Edit']
      ],
      ['div.level-item',
        [`button.button.is-danger#${deletebuttonid}`, 'Delete']
      ]
    ]
  ]
]

const editEntry = ({ text, _rev }, { textinputid, textsaveid, cancelid }) => [
  'form.form.box',
  [
    'div.field',
    ['label.label', _rev ? 'Edit Entry' : 'Log Entry'],
    [
      'div.control',
      [`textarea.textarea#${textinputid}`, { placeholder: 'What happened?' }, text],
      ['p.small', 'Use Markdown!']
    ]
  ],
  [
    'div.field',
    [
      'div.control',
      [`button.input.is-primary#${textsaveid}`, 'Save']
    ]
  ],
  _rev
    ? [
        'div.field',
        [
          'div.control',
          [`button.input.is-light#${cancelid}`, 'Cancel']
        ]
      ]
    : ''
]

const listEntries = (entries) => entries.map(entry => [
  'div.block',
  [
    'log-entry',
    {
      'log-_id': entry._id,
      'log-_rev': entry._rev,
      'log-text': entry.text,
      'log-createdAt': entry.createdAt
    }
  ]
])

const entryFilter = (filterid) => [
  'form.form.box',
  [
    'div.field',
    ['label.label', 'Filter entries by word:'],
    [
      'div.control',
      [`input.input#${filterid}`, {
        type: 'text',
        placeholder: 'Filter...'
      }]
    ]
  ]
]

/* ELEMENTS */

class LogEntry extends HTMLElement {
  async connectedCallback () {
    const id = this.getAttribute('log-_id')
    const rev = this.getAttribute('log-_rev') || null
    let text = this.getAttribute('log-text') || ''
    const createdAt = parseInt(this.getAttribute('log-createdAt'), 10) || Date.now()
    let editing = !rev
    const cancelid = uuid()
    const deletebuttonid = uuid()
    const editbuttonid = uuid()
    const textinputid = uuid()
    const textsaveid = uuid()
    const refresh = async () => {
      const entry = { _id: id, _rev: rev, text, createdAt }
      if (editing) {
        this.innerHTML = alchemize(editEntry(entry, { textinputid, textsaveid, cancelid }))
        if (id && rev) {
          listento(cancelid, 'click', (e) => {
            e.preventDefault()
            editing = false
            refresh()
          })
        }
        listento(textsaveid, 'click', async (e) => {
          e.preventDefault()
          text = snag(textinputid).value
          if (!id && !rev) {
            await saveEntry(text)
          } else {
            const entry = { _id: id, _rev: rev, text, createdAt }
            await forcePut(entry)
          }
        })
      } else {
        this.innerHTML = alchemize(showEntry(entry, { editbuttonid, deletebuttonid }))
        listento(editbuttonid, 'click', (e) => {
          e.preventDefault()
          editing = true
          refresh()
        })
        listento(deletebuttonid, 'click', async (e) => {
          e.preventDefault()
          const ok = window.confirm('Are you sure you want to delete this entry?')
          if (ok) await forceRemove({ _id: id })
        })
      }
    }
    refresh()
  }
}

class Logbook extends HTMLElement {
  async connectedCallback () {
    this.innerHTML = alchemize(['section.section', ['p.subtitle', 'Loading...']])
    const listid = uuid()
    const filterid = uuid()
    let entries = await getDocsByTime()
    console.log(entries)
    this.innerHTML = alchemize([
      ['div.block', ['log-entry', '']],
      ['div.block', entryFilter(filterid)],
      [`div.block#${listid}`, entries.length ? listEntries(entries) : '']
    ])
    const refresh = () => {
      snag(listid).innerHTML = alchemize(listEntries(entries))
    }
    listento(filterid, 'input', async (event) => {
      event.preventDefault()
      entries = await getDocsByWord(event.target.value)
      refresh()
    })
    db.changes({ since: 'now', live: true, ...INCLUDE_DOCS })
      .on('change', async (change) => {
        console.log(change.doc)
        entries = await getDocsByTime()
        refresh()
      })
  }
}

class App extends HTMLElement {
  connectedCallback () {
    this.innerHTML = alchemize([
      'section.section',
      [
        'div.container',
        [
          'div.block',
          ['h1.title', 'Alchemical Logbook'],
          ['p.subtitle', 'Markdown Notes']
        ],
        ['my-logbook', '']
      ]
    ])
  }
}

/* POSTLUDE */

customElements.define('log-entry', LogEntry)
customElements.define('my-logbook', Logbook)
customElements.define('my-app', App)
