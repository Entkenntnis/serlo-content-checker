const { store, headVersion } = require('./entity_data_store.json')

const walk = require('./utils/content-walker')
const escape = require('./utils/html-escape')

const katex = require('katex')

const brokenFormulas = []
const sanitizerFail = []

for (const id in store) {
  const entity = store[id]
  if (entity.version != headVersion)
    continue
  walk(entity.data.content, node => {
    if (node.type == 'math' || node.type == 'inline-math') {
      checkKatex(node.formula, node.formulaSource, entity, id)
    }
    if (node.type == 'equations') {
      for (const step of node.steps) {
        checkKatex(step.left, step.leftSource, entity, id)
        checkKatex(step.right, step.rightSource, entity, id)
        checkKatex(step.transform, step.transformSource, entity, id)
      }
    }
  })
}



function checkKatex(formula, source, entity, id) {
  if (formula === undefined) {
    console.log('Empty formula', id)
    return
  }
  if (source === undefined) {
    console.log('Old version without source:', id)
    return
  }
  let formulaWorking = false
  let sourceWorking = false
  let message = ''
  try {
    katex.renderToString(formula)
    formulaWorking = true
  } catch (e) {
    message = e.message
  }
  try {
    katex.renderToString(source)
    sourceWorking = true
  } catch (e) {
    console.log(e.message)
  }
  if (sourceWorking && !formulaWorking) {
    sanitizerFail.push({
      formula,
      source,
      message,
      id,
      converted: entity.converted,
      type: entity.data.typename
    })
  }
  if (!formulaWorking) {
    brokenFormulas.push({
      formula,
      source,
      message,
      id,
      converted: entity.converted,
      type: entity.data.typename
    })
  }
}

brokenFormulas.sort((a, b) => {
  let a_ = a.converted ? 1 : 0
  let b_ = b.converted ? 1 : 0
  if (a_ != b_) return b_ - a_
  else return b.id - a.id
})

const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Defekte Formeln</title>
  </head>
  <body>
    <table border="1">
      <tr>
        <th>Nr</th>
        <th>Inhalt</th>
        <th>Formel</th>
        <th>Fehler</th>
      </tr>
    ${brokenFormulas.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          ${row.type}:
          <a href="https://frontend.serlo.org/${row.id}">${row.id}</a>
          ${row.converted ? '' : '[legacy]'}
        </td>
        <td><code>${escape(row.source)}</code></td>
        <td>${escape(row.message)}</td>
      </tr>
    `).join('')}
    </table>
  </body>
</html>`

require('fs').writeFileSync('./reports/katex.html', html)
