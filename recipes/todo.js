/* global HTMLElement, customElements, document, PouchDB, emit */

import { alchemize, sanctify, listento, snag } from '../index.js'
import { default as uuid } from 'https://www.unpkg.com/uuid@11.0.5/dist/esm-browser/v4.js' // eslint-disable-line

/* DATABASE BUSINESS */

const db = new PouchDB('alchemist-todo')

const DDOC = {
  _id: '_design/todo',
  views: {
    todos: {
      map: function (doc) {
        if (doc._id.match(/^todo-item/)) {
          emit(doc.text)
        }
      }.toString()
    },
    words: {
      map: function (doc) {
        if (doc._id.match(/^todo-item/)) {
          for (const word of doc.text.split(' ')) {
            emit(word)
          }
        }
      }.toString()
    }
  }
}

await forcePut(DDOC) // create indices

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

async function forceRemove (doc) {
  try {
    return await db.remove(doc)
  } catch (e) {
    if (e.status !== 409) throw e
    const { _id, _rev } = await db.get(doc._id)
    return db.remove({ _id, _rev })
  }
}

async function allDocsByText () {
  const { rows } = await db.query('todo/todos', {
    include_docs: true
  })
  return rows.map(({ doc }) => doc)
}

async function allDocsByWord (w) {
  const { rows: matches } = await db.query('todo/words', {
    startkey: w,
    endkey: w + '\uffff'
  })
  const ids = Object.keys(matches.reduce((uniq, { id }) => {
    if (!uniq[id]) uniq[id] = true
    return uniq
  }, {}))
  const { rows } = await db.allDocs({ keys: ids, include_docs: true })
  return rows.map(({ doc }) => doc)
}

// TEMPLATES

const editTodoItem = (text, { textinputid, textsaveid, error }) => [
  'form.form',
  [
    'div.field.has-addons',
    [
      'div.control.is-expanded',
      [`input.input#${textinputid}`, { type: 'text', value: text, placeholder: 'What needs doing?' }]
    ],
    [
      'div.control',
      [`button.input.is-primary#${textsaveid}`, 'Save']
    ]
  ],
  error ? ['p.help.is-danger', error] : ''
]

const showTodoItem = (text, { texteditid, todocompleteid }) => [
  'div.level',
  [
    'div.level-left',
    ['div.level-item', sanctify('p', text)]
  ],
  [
    'div.level-right',
    ['div.level-item', [`button.button.is-primary#${todocompleteid}`, 'Done']],
    ['div.level-item', [`button.button.is-info#${texteditid}`, 'Edit']]
  ]
]

const todoFilter = (filterid) => [
  'form.form',
  [
    'div.field',
    [
      'div.control.is-expanded',
      [`input.input#${filterid}`, {
        type: 'text',
        placeholder: 'Filter...'
      }]
    ]
  ]
]

const todoList = (docs) => [
  'ul',
  docs.map(({ text, _id, _rev }) => [
    'li.block',
    [
      'todo-item',
      {
        'todo-text': text,
        'todo-id': _id,
        'todo-rev': _rev
      }
    ]
  ])
]

// ELEMENTS

class TodoItem extends HTMLElement {
  connectedCallback () {
    let error
    let text = this.getAttribute('todo-text') || ''
    const id = this.getAttribute('todo-id') || `todo-item/${uuid()}`
    let rev = this.getAttribute('todo-rev') || null
    let editing = !text
    const textinputid = uuid()
    const textsaveid = uuid()
    const texteditid = uuid()
    const todocompleteid = uuid()
    const refresh = () => {
      if (editing) {
        this.innerHTML = alchemize(editTodoItem(text, { textinputid, textsaveid, error }))
        listento(textsaveid, 'click', async (event) => {
          event.preventDefault()
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
              const res = await forcePut(doc)
              rev = res.rev
            }
          }
          refresh()
        })
      } else {
        this.innerHTML = alchemize(showTodoItem(text, { texteditid, todocompleteid }))
        listento(todocompleteid, 'click', async () => {
          await forceRemove({ _id: id, _rev: rev })
        })
        listento(texteditid, 'click', () => {
          editing = true
          refresh()
        })
      }
    }
    // initialize the edit/show cycle
    refresh()
  }
}

class TodoList extends HTMLElement {
  async connectedCallback () {
    const newentryid = uuid()
    const filterid = uuid()
    const todoid = uuid()
    let todos = await allDocsByText()
    this.innerHTML = alchemize([
      [`div.block#${newentryid}`, ['todo-item', '']],
      ['div.block', todoFilter(filterid)],
      [`div.block#${todoid}`, todoList(todos)]
    ])
    const refresh = () => {
      snag(todoid).innerHTML = alchemize(todoList(todos))
      snag(newentryid).innerHTML = alchemize(['todo-item', ''])
    }
    listento(filterid, 'input', async (event) => {
      event.preventDefault()
      const w = document.getElementById(filterid).value
      const unsorted = await allDocsByWord(w)
      todos = unsorted.toSorted((a, b) => a.text > b.text)
      refresh()
    })
    db.changes({ since: 'now', live: true })
      .on('change', async () => {
        todos = await allDocsByText()
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
        ['div.block',
          ['h1.title', 'Alchemical Todo'],
          ['p.subtitle', 'Efficient Reminders'],
          ['p', ['a', { href: 'https://github.com/garbados/html-alchemist/blob/main/recipes/todo.js' }, 'Source']]
        ],
        ['div.block', ['todo-list', '']]
      ]
    ])
  }
}

customElements.define('todo-item', TodoItem)
customElements.define('todo-list', TodoList)
customElements.define('my-app', App)
