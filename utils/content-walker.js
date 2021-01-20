function walk(node, cb) {
  if (!node)
    return
  
  if (Array.isArray(node)) {
    node.forEach(node => walk(node, cb))
    return
  }
  
  if (node.type) {
    cb(node)
  }
  
  if (Object.prototype.toString.call(node) == '[object Object]') {
    for (const key of Object.keys(node)) {
      walk(node[key], cb)
    }
  }
}

module.exports = walk
