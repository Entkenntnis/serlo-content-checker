const fs = require('fs')
const fetch = require('node-fetch')

const storeFilePath = './entity_data_store.json'

if (!fs.existsSync(storeFilePath)) {
  fs.writeFileSync(storeFilePath, JSON.stringify({
    headVersion: 1,
    store: {}
  }, null, 2))
}

const {headVersion, store} = require(storeFilePath)

const idStore = require('./id_store.json')

const todoList = []

idStore.applet.forEach(entity => todoList.push(entity))
idStore.article.forEach(entity => todoList.push(entity))
idStore['course-page'].forEach(entity => todoList.push(entity))
idStore.event.forEach(entity => todoList.push(entity))
idStore.video.forEach(entity => todoList.push(entity))

idStore['text-exercise'].forEach(entity => entity.converted && todoList.push(entity))
idStore['text-exercise-group'].forEach(entity => entity.converted && todoList.push(entity))

let counter = 0
let requestCounter = 0

console.log(`${todoList.length} items to do.`)

run()

async function run() {
  for (const entry of todoList) {
    let retryCounter = 0
    while (retryCounter < 2) {
      try {
        await getEntity(entry)
        break
      } catch (e) {
        retryCounter++
        console.log(e, entry)
        await require('./utils/sleep')(1000)
      }
    }
    counter++
    if (requestCounter >= 10) {
      fs.writeFileSync(storeFilePath, JSON.stringify({
        headVersion, store
      }, null, 2))
      console.log(`Saving at ${counter} ...`)
      requestCounter = 0
    }
  }
}

async function getEntity(entry) {
  if (store[entry.id]) {
    if (store[entry.id].version == headVersion) {
      return // skipping
    }
  }
  const res = await fetch('http://localhost:3000/api/frontend/' + entry.id)
  if (res.status !== 200) {
    throw 'Error Code ' + res.status
  }
  const pageData = await res.json()
  if (!pageData.kind == 'single-entity') {
    throw 'Wrong entity type: ' + pageData.kind
  }
  if (pageData.entityData.id != entry.id) {
    throw 'Inconsistent data'
  }
  store[entry.id] = {
    converted: entry.converted,
    version: headVersion,
    data: pageData.entityData
  }
  requestCounter++
  console.log('success', entry)
  await require('./utils/sleep')(500)
}
