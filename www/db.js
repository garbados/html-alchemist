/* global emit */

/* DATABASE PRELUDE */
// OH LORDS OF DATA
// I HAVE GIVEN YOU MY SPIRIT.
// DO YOU HEAR MY THOUGHTS
// AS I HEAR THE SPIN OF YOUR DISKS?
// I OPEN MY EYES AND ETERNITY SPRAWLS
// COLUMN BY COLUMN, TICK BY LOGICAL TICK.
// IN YOUR REALM OF HERE AND THEN AND WHERE AND NEVER
// EVEN SPACE AND TIME KNEEL TO THE MIND.

export async function forcePut (db, doc) {
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

export async function forceRemove (db, doc) {
  try {
    return await db.remove(doc)
  } catch (e) {
    if (e.status !== 409) throw e
    const { _id, _rev } = await db.get(doc._id)
    return db.remove({ _id, _rev })
  }
}

export function resToDocs ({ rows }) {
  return rows.map(({ doc }) => doc)
}

export const INCLUDE_DOCS = { include_docs: true }

export async function queryToDocs (db, query, opts = {}) {
  const res = await db.query(query, { ...opts, ...INCLUDE_DOCS })
  return resToDocs(res)
}

// this is my favorite party trick
export const wordsearch = function (id) {
  return function (doc) {
    if (doc._id.match(/^%s\/.+$/)) {
      const words = doc.text
        .replace(/["`(){}[]<>]/g, ' ')
        .split(/\s+/g)
      for (const word of words) {
        emit(word)
      }
    }
  }.toString().replace('%s', id)
}
