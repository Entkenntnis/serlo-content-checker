const { store, headVersion } = require('./entity_data_store.json')
const { path2uuid, uuid2paths } = require('./resolver.json')
const fetch = require('node-fetch')
const { request } = require('graphql-request')
const escape = require('./utils/html-escape')

const fs = require('fs')

const walk = require('./utils/content-walker')
const generateReport = require('./utils/generate-report')

const linkcheckCache = './linkcheck_cache.json'

if (!fs.existsSync(linkcheckCache)) {
  fs.writeFileSync(linkcheckCache, JSON.stringify({
    intern: {},
    extern: {}
  }, null, 2))
}

const cache = require(linkcheckCache)

const links = []
const brokenLinks = []

for (const id in store) {
  const entity = store[id]
  if (entity.version != headVersion)
    continue
  walk(entity.data.content, node => {
    if (node.type == 'a') {
      const href = node.href
      let text = ''
      walk(node.children, node => {
        if (node.text)
          text += node.text + ' '
      })
      const linkBase = {
        id,
        type: entity.data.typename,
        converted: entity.converted,
        href,
        text
      }
      if (!href || !href.trim()) {
        //brokenLinks.push(linkBase)
        return // ignore
      }
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
        links.push({
          ...linkBase,
          extern: true,
        })
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
      links.push({
        ...linkBase,
        normalized,
        extern: false,
      })
    }
  })
}


function normalizeSerloLink(href) {
  // compat: some user are typing \1234 instead of /1234
  if (/^\\[\d]+$/.test(href)) {
    return href.replace('\\', '/')
  }
  
  href = href.replace(/#.*$/, '')

  return href.startsWith(`https://de.serlo.org`)
    ? href.replace(`https://de.serlo.org`, '')
    : href.startsWith(`http://de.serlo.org`)
    ? href.replace(`http://de.serlo.org`, '')
    : href.startsWith('/')
    ? href
    : '/' + href
}

checkLinks()

async function checkLinks() {
  let requestCount = 0
  
  console.log('Total amount:', links.length)
  
  for (let pass = 1; pass <= 2; pass++) {
    console.log('Pass:', pass)
    let counter = 0
    for (const link of links) {
      counter++
      if (link.extern) {
        if (!cache.extern[link.href])
          cache.extern[link.href] = { failures: 0}
        const c = cache.extern[link.href]
        if (c.success) {
          continue // already working
        }
        if (!c.failures || c.failures < pass) {
          // check this link
          try {
            const res = await fetch(link.href, {
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:83.0) Gecko/20100101 Firefox/83.0'
              }
            })
            if (res.status >= 400) {
              c.errorCode = res.status
              throw 'Wrong status ' + res.status
            }
            console.log('extern success', link.href)
            requestCount++
            c.success = true
          } catch (e) {
            console.log(e, link, ++c.failures)
          }
          await require('./utils/sleep')(1000)
        }
      } else {
        // intern
        if (!cache.intern[link.normalized])
          cache.intern[link.normalized] = { failures: 0}
        const c = cache.intern[link.normalized]
        if (c.success) {
          continue // already working
        }
        if (!c.failures || c.failures < pass) {
          // check this link
          try {
            const query = `
{
  uuid(alias:{instance:de,path:"${link.normalized.replace(/"/g, '\\"')}"}) {
    id
  }
}
  `
            const data = await request('https://api.serlo.org/graphql', query)
            const id = data.uuid.id
            if (!id) throw 'no id'
            console.log('intern success', link.normalized)
            requestCount++
            c.success = true
          } catch (e) {
            console.log(e, link, ++c.failures)
          }
          await require('./utils/sleep')(1000)
        }
      }
      if (requestCount > 10) {
        requestCount = 0
        console.log('saving cache ...', counter)
        fs.writeFileSync(linkcheckCache, JSON.stringify(cache, null, 2))
      }
    }
  }
  
  for (const link of links) {
    const store = cache[link.extern ? 'extern' : 'intern']
    const entry = store[link.extern ? link.href : link.normalized]
    if (entry && !entry.success) {
      if (entry.errorCode == 403 && link.href.includes('pixabay'))
        continue // ignore
      
      if (entry.errorCode == 400 && link.href.includes('wikipedia'))
        continue // ignore
      
      brokenLinks.push({...link, errorCode: entry.errorCode})
    }
  }
  
  
  brokenLinks.sort((a, b) => {
    let a_ = a.converted ? 1 : 0
    let b_ = b.converted ? 1 : 0
    if (a_ != b_) return b_ - a_
    else return b.id - a.id
  })
  
  generateReport(
    './reports/deadlinks.html',
    'Defekte Links',
    ['Inhalt', 'Link (soll keine Umlaute enthalten, externe Links bitte mit Protokoll)', 'Text', 'Fehlercode'],
    [
      row => `${row.type}:
        <a href="https://frontend.serlo.org/${row.id}">${row.id}</a>
        ${row.converted ? '' : '[legacy]'}`,
      row => `<a href="${row.extern ? row.href : 'https://de.serlo.org' + row.normalized}">${escape(row.href)}</a>`,
      row => escape(row.text),
      row => row.errorCode ? row.errorCode : ''
    ],
    brokenLinks
  )
}
