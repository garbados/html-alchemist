/* global HTMLElement, customElements, PouchDB, emit, confirm */

import { forcePut, forceRemove, resToDocs, INCLUDE_DOCS, queryToDocs, wordsearch } from './db.js'
import { refresh, snag } from './alchemist.js'
import { default as uuid } from 'https://cdn.jsdelivr.net/npm/uuid@11.1.0/dist/esm-browser/v4.js' // eslint-disable-line

/* DATABASE BUSINESS */

const db = new PouchDB('alchemist-todo')
const idprefix = 'todo-item'

const DDOC = {
  _id: '_design/todo',
  views: {
    todos: {
      map: function (doc) {
        if (doc._id.match(/^%s\/.+$/)) {
          emit(doc.text)
        }
      }.toString().replace('%s', idprefix)
    },
    words: { map: wordsearch(idprefix) }
  }
}

await forcePut(db, DDOC) // setup indices

// QUERIES

const allDocsByText = queryToDocs.bind(null, db, 'todo/todos')

async function allDocsByWord (w) {
  const { rows: matches } = await db.query('todo/words', {
    startkey: w,
    endkey: w + '\uffff'
  })
  const ids = Object.keys(matches.reduce((uniq, { id }) => {
    if (!uniq[id]) uniq[id] = true
    return uniq
  }, {}))
  const res = await db.allDocs({ keys: ids, ...INCLUDE_DOCS })
  return resToDocs(res)
}

// TEMPLATES

const editTodoItem = (text, { textinputid, onsave, error }) => [
  'form',
  [
    'fieldset',
    { role: 'group' },
    [`input#${textinputid}`, { type: 'text', value: text, placeholder: 'What needs doing?' }],
    ['button', { onclick: onsave }, 'Save']
  ],
  error ? ['small', error] : ''
]

const showTodoItem = (text, { oncomplete, onedit }) => [
  'section.grid',
  ['article', text],
  [
    'div',
    { role: 'group' },
    ['button.secondary', { onclick: oncomplete }, 'Done'],
    ['button.contrast', { onclick: onedit }, 'Edit']
  ]
]

const todoFilter = ({ oninput }) => [
  'form',
  ['input', {
    type: 'text',
    placeholder: 'Filter...',
    oninput
  }]
]

const todoList = (docs) => docs.map(({ text, _id, _rev }) => [
  'todo-item',
  {
    'todo-text': text,
    'todo-id': _id,
    'todo-rev': _rev
  }
])

// ELEMENTS

class TodoItem extends HTMLElement {
  connectedCallback () {
    const elem = this
    let error
    let text = this.getAttribute('todo-text') || ''
    const id = this.getAttribute('todo-id') || `todo-item/${uuid()}`
    let rev = this.getAttribute('todo-rev') || null
    let editing = !text
    const textinputid = uuid()
    async function onsave (e) {
      e.preventDefault()
      const oldText = text
      text = snag(textinputid).value
      if (text.length === 0) {
        error = 'A todo cannot be empty.'
      } else {
        error = null
        editing = false
        if (text !== oldText) {
          const doc = { _id: id, text }
          if (rev) doc._rev = rev
          const res = await forcePut(db, doc)
          rev = res.rev
        }
      }
      refreshItem()
    }
    async function onedit (e) {
      e.preventDefault()
      editing = true
      refreshItem()
    }
    async function oncomplete (e) {
      e.preventDefault()
      if (confirm(`Is this done? ${text}`)) { await forceRemove(db, { _id: id, _rev: rev }) }
    }
    function refreshItem () {
      if (editing) {
        refresh(elem, editTodoItem(text, { textinputid, onsave, error }))
      } else {
        refresh(elem, showTodoItem(text, { onedit, oncomplete }))
      }
    }
    // initialize the edit/show cycle
    refreshItem()
  }
}

class TodoList extends HTMLElement {
  async connectedCallback () {
    const newentryid = uuid()
    const todoid = uuid()
    async function oninput (e) {
      e.preventDefault()
      const todos = await allDocsByWord(e.target.value)
      const sorted = todos.toSorted((a, b) => a.text > b.text)
      await refreshList(sorted)
    }
    const refreshList = async (todos) => {
      if (!todos) todos = await allDocsByText()
      refresh(newentryid, ['todo-item', ''])
      refresh(todoid, todoList(todos))
    }
    // initial state
    refresh(this, [
      [`div#${newentryid}`, ''],
      ['div', todoFilter({ oninput })],
      [`div#${todoid}`, '']
    ])
    // refresh state from
    await refreshList()
    // refresh when db changes
    db.changes({ since: 'now', live: true })
      .on('change', () => refreshList())
  }
}

customElements.define('todo-item', TodoItem)
customElements.define('todo-list', TodoList)
