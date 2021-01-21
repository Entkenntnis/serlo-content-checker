const { store, headVersion } = require('./entity_data_store.json')
const { path2uuid, uuid2paths } = require('./resolver.json')

const walk = require('./utils/content-walker')

const brokenLinks = []
let exCounter = 0

for (const id in store) {
  const entity = store[id]
  if (entity.version != headVersion)
    continue
  walk(entity.data.content, node => {
    if (node.type == 'a') {
      const href = node.href
      if (href.startsWith('#')) {
        // anchor is ok
        return
      }
      if (href.startsWith('mailto:')) {
        // mail is ok
        return
      }
      if (href.includes('//') && !href.includes('de.serlo.org')) {
        // external link
        //console.log(href)
        exCounter++
        return
      }
      const normalized = normalizeSerloLink(href)
      if (path2uuid[normalized]) {
        // found
        return
      }
      if (/^\/[\d]/.test(normalized)) {
        if (uuid2paths[normalized.substring(1)]) {
          // id exists
          return
        }
      }
      brokenLinks.push(normalized)
    }
  })
}

console.log(brokenLinks.length, exCounter)


function normalizeSerloLink(href) {
  // compat: some user are typing \1234 instead of /1234
  if (/^\\[\d]+$/.test(href)) {
    return href.replace('\\', '/')
  }
  
  href = href.replace(/#.*$/, '')

  return href.startsWith(`https://de.serlo.org/`)
    ? href.replace(`https://de.serlo.org`, '')
    : href.startsWith(`http://de.serlo.org/`)
    ? href.replace(`http://de.serlo.org/`, '')
    : href.startsWith('/')
    ? href
    : '/' + href
}
