const { store } = require('./entity_data_store.json')

let highestVersion = 1

for (const key of Object.keys(store)) {
  highestVersion = Math.max(store[key].version, highestVersion)
}

// avoid using this by accident
/*require('fs').writeFileSync('./entity_data_store.json', JSON.stringify({
  headVersion: highestVersion + 1,
  store
}, null, 2))*/
