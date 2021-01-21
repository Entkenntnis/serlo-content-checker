const { store, headVersion } = require('./entity_data_store.json')

const walk = require('./utils/content-walker')
const escape = require('./utils/html-escape')
const generateReport = require('./utils/generate-report')

const regex = /%%.*%%/
const unrendered = []

for (const id in store) {
  const entity = store[id]
  if (entity.version != headVersion)
    continue
  walk(entity.data.content, node => {
    if (node.type == 'text') {
      if (regex.test(node.text)) {
        console.log(entity.converted)
        unrendered.push({
          id,
          converted: entity.converted,
          type: entity.data.typename,
          text: node.text
        })
      }
    }
  })
}

unrendered.sort((a, b) => {
  let a_ = a.converted ? 1 : 0
  let b_ = b.converted ? 1 : 0
  if (a_ != b_) return b_ - a_
  else return b.id - a.id
})

generateReport(
  './reports/unrendered.html',
  'Nicht angezeigte Formeln im Text',
  ['Inhalt', 'Text'],
  [
    row => `${row.type}:
      <a href="https://frontend.serlo.org/${row.id}">${row.id}</a>
      ${row.converted ? '' : '[legacy]'}`,
    row => escape(row.text)
  ],
  unrendered
)
