const { store } = require('./entity_data_store.json')

const walk = require('./utils/content-walker')

const katex = require('katex')

const brokenFormulas = []

for (const id in store) {
  const entity = store[id]
  walk(entity.data.content, node => {
    if (node.type == 'math' || node.type == 'inline-math') {
      try {
        katex.renderToString(node.formula)
      } catch (e) {
        //console.log(e)
        console.log(e.message)
        brokenFormulas.push({
          formula:node.formula,
          message:e.message,
          id,
          converted: entity.converted,
          type: entity.data.typename
        })
      }
    }
  })
}

brokenFormulas.sort((a, b) => b.id - a.id)

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
        <th>Inhalt</th>
        <th>Formel</th>
        <th>Fehler</th>
      </tr>
    ${brokenFormulas.map(row => `
      <tr>
        <td>
          ${row.type}:
          <a href="https://frontend.serlo.org/${row.id}">${row.id}</a>
          ${row.converted ? '' : '[legacy]'}
        </td>
        <td><code>${row.formula}</code></td>
        <td>${row.message}</td>
      </tr>
    `).join('')}
    </table>
  </body>
</html>`

require('fs').writeFileSync('./reports/katex.html', html)
