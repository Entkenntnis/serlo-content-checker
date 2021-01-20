const fetch = require('node-fetch')

async function run() {
  const ids = await fetch('https://de.serlo.org/entities/are-we-edtr-io-yet')
  const json = await ids.json()
  require('fs').writeFileSync('./id_store.json', JSON.stringify(json, null, 2))
}

run()
