/* global HTMLElement, customElements, PouchDB, emit */

import { alchemize, listento, profane, snag } from './alchemist.js'
import { default as uuid } from 'https://cdn.jsdelivr.net/npm/uuid@11.1.0/dist/esm-browser/v4.js' // eslint-disable-line
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.min.js'

/* DATABASE PRELUDE */

const db = new PouchDB('alchemist-logbook')

// OH LORDS OF DATA

const DDOC = {
  _id: '_design/logbook',
  views: {
    byCreatedAt: {
      map: function (doc) {
        if (doc._id.match(/^log-entry\/.+$/)) {
          emit(doc.createdAt)
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

// I HAVE GIVEN YOU MY MIND.

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

// COLUMN BY COLUMN, TICK BY LOGICAL TICK.

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

// EVEN SPACE AND TIME KNEEL TO THE MIND.

await forcePut(DDOC)

/* TEMPLATES */

const showEntry = ({ text, createdAt }, { editbuttonid, deletebuttonid }) => [
  'section',
  profane('article', marked.parse(text)),
  ['hr', ''],
  ['div.grid',
    ['p', (new Date(createdAt)).toLocaleString()],
    [`button.secondary#${editbuttonid}`, 'Edit'],
    [`button.contrast#${deletebuttonid}`, 'Delete']
  ]
]

const editEntry = ({ text, _rev }, { textinputid, textsaveid, cancelid }) => [
  'form',
  [
    'fieldset',
    ['label',
      _rev ? 'Edit Entry' : 'Log Entry',
      [`textarea#${textinputid}`, { placeholder: 'What happened?' }, text],
      ['small', 'Use Markdown!']
    ],
    [
      'div.grid',
      [`button#${textsaveid}`, 'Save'],
      _rev ? [`button.outline.secondary#${cancelid}`, 'Cancel'] : ''
    ]
  ]
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
        this.replaceChildren(alchemize(editEntry(entry, { textinputid, textsaveid, cancelid })))
        if (id && rev) {
          listento(cancelid, 'click', (e) => {
            e.preventDefault()
            editing = false
            refresh()
          })
        }
        listento(textsaveid, 'click', async (e) => {
          e.preventDefault()
          const textinput = snag(textinputid)
          text = textinput.value
          if (!id && !rev) {
            await saveEntry(text)
          } else {
            const entry = { _id: id, _rev: rev, text, createdAt }
            await forcePut(entry)
          }
          textinput.value = ''
        })
      } else {
        this.replaceChildren(alchemize(showEntry(entry, { editbuttonid, deletebuttonid })))
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

class LogbookApp extends HTMLElement {
  async connectedCallback () {
    this.replaceChildren(alchemize(['section.section', ['p.subtitle', 'Loading...']]))
    const listid = uuid()
    const filterid = uuid()
    let entries = await getDocsByTime()
    this.replaceChildren(alchemize([
      ['div.block', ['log-entry', '']],
      ['div.block', entryFilter(filterid)],
      [`div.block#${listid}`, entries.length ? listEntries(entries) : '']
    ]))
    const refresh = () => {
      snag(listid).replaceChildren(alchemize(listEntries(entries)))
    }
    listento(filterid, 'input', async (event) => {
      event.preventDefault()
      entries = await getDocsByWord(event.target.value)
      refresh()
    })
    db.changes({ since: 'now', live: true, ...INCLUDE_DOCS })
      .on('change', async () => {
        entries = await getDocsByTime()
        refresh()
      })
  }
}

/* POSTLUDE */

customElements.define('log-entry', LogEntry)
customElements.define('logbook-app', LogbookApp)
