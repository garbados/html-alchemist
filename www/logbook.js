/* global HTMLElement, customElements, PouchDB, emit */

import { forcePut, forceRemove, resToDocs, INCLUDE_DOCS, queryToDocs, wordsearch } from './db.js'
import { profane, refresh, snag } from './alchemist.js'
import { default as uuid } from 'https://cdn.jsdelivr.net/npm/uuid@11.1.0/dist/esm-browser/v4.js' // eslint-disable-line
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.min.js'

const db = new PouchDB('alchemist-logbook')
const idprefix = 'log-entry'

const DDOC = {
  _id: '_design/logbook',
  views: {
    byCreatedAt: {
      map: function (doc) {
        if (doc._id.match(/^%s\/.+$/)) {
          emit(doc.createdAt)
        }
      }.toString().replace('%s', idprefix)
    },
    byWord: { map: wordsearch(idprefix) }
  }
}

await forcePut(db, DDOC) // setup queries

const getDocsByTime = () =>
  queryToDocs(db, 'logbook/byCreatedAt', { descending: true })

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

const saveEntry = async (text) => {
  const doc = { text, _id: `${idprefix}/${uuid()}`, createdAt: Date.now() }
  return db.put(doc)
}

/* TEMPLATES */

const showEntry = ({ text, createdAt }, { onedit, ondelete }) => [
  'section',
  profane('article', marked.parse(text)),
  ['hr', ''],
  ['div.grid',
    ['p', (new Date(createdAt)).toLocaleString()],
    ['button.secondary', { onclick: onedit }, 'Edit'],
    ['button.contrast', { onclick: ondelete }, 'Delete']
  ]
]

const editEntry = ({ text, _rev }, { textinputid, onsave, oncancel }) => [
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
      ['button', { onclick: onsave }, 'Save'],
      _rev ? ['button.outline.secondary', { onclick: oncancel }, 'Cancel'] : ''
    ]
  ]
]

const listEntries = (entries) => entries.map(({ _id, _rev, text, createdAt }) => [
  'div.block',
  [
    'log-entry',
    {
      'log-id': _id,
      'log-rev': _rev,
      'log-text': text,
      'log-createdAt': createdAt
    }
  ]
])

const entryFilter = ({ oninput }) => [
  'form.form.box',
  [
    'div.field',
    ['label.label', 'Filter entries by word:'],
    [
      'div.control',
      ['input.input', {
        type: 'text',
        placeholder: 'Filter...',
        oninput
      }]
    ]
  ]
]

/* ELEMENTS */

class LogEntry extends HTMLElement {
  async connectedCallback () {
    // setup
    const elem = this
    const id = this.getAttribute('log-id')
    const rev = this.getAttribute('log-rev') || null
    let text = this.getAttribute('log-text') || ''
    const createdAt = parseInt(this.getAttribute('log-createdAt'), 10) || Date.now()
    let editing = !rev
    const textinputid = uuid()
    // on save
    async function onsave (e) {
      e.preventDefault()
      const textinput = snag(textinputid)
      text = textinput.value
      if (!id && !rev) {
        await saveEntry(text)
      } else {
        const entry = { _id: id, _rev: rev, text, createdAt }
        await forcePut(db, entry)
      }
      textinput.value = ''
    }
    // on cancel
    async function oncancel (e) {
      e.preventDefault()
      editing = false
      refreshLogEntry()
    }
    // on edit
    async function onedit (e) {
      e.preventDefault()
      editing = true
      refreshLogEntry()
    }
    // on delete
    async function ondelete (e) {
      e.preventDefault()
      const ok = window.confirm('Are you sure you want to delete this entry?')
      if (ok) await forceRemove(db, { _id: id })
    }
    // refresh
    async function refreshLogEntry () {
      const entry = { _id: id, _rev: rev, text, createdAt }
      if (editing) {
        refresh(elem, editEntry(entry, { textinputid, onsave, oncancel }))
      } else {
        refresh(elem, showEntry(entry, { onedit, ondelete }))
      }
    }
    // begin
    refreshLogEntry()
  }
}

class LogbookApp extends HTMLElement {
  async connectedCallback () {
    // loading...
    refresh(this, ['section.section', ['p.subtitle', 'Loading...']])
    let entries = await getDocsByTime()
    async function oninput (e) {
      e.preventDefault()
      entries = await getDocsByWord(e.target.value)
      refreshEntries()
    }
    const listid = uuid()
    function refreshEntries () {
      refresh(listid, listEntries(entries))
    }
    // ...loaded!
    refresh(this, [
      ['div.block', ['log-entry', '']],
      ['div.block', entryFilter({ oninput })],
      [`div.block#${listid}`, entries.length ? listEntries(entries) : '']
    ])
    // refresh when db changes
    db.changes({ since: 'now', live: true, ...INCLUDE_DOCS })
      .on('change', async () => {
        entries = await getDocsByTime()
        refreshEntries()
      })
  }
}

/* POSTLUDE */

customElements.define('log-entry', LogEntry)
customElements.define('logbook-app', LogbookApp)
