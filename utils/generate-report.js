

function generateReport(path, title, headers, printer, data) {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
    </head>
    <body>
      <table border="1">
        <tr>
          <th>Nr</th>
          ${headers.map(header => `<th>${header}</th>`).join('')}
        </tr>
      ${data.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          ${printer.map(p => `
            <td>${p(row)}</td>
          `).join('')}
        </tr>
      `).join('')}
      </table>
    </body>
  </html>`

  require('fs').writeFileSync(path, html)
}

module.exports = generateReport
