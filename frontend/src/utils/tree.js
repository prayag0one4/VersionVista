export const buildTree = (files) => {
  const root = { name: '', path: '', type: 'dir', children: [] }

  for (const file of files) {
    const filePath = typeof file === 'string' ? file : file.filePath || file.path || ''
    const parts = filePath.split('/').filter(Boolean)

    let cursor = root

    parts.forEach((part, index) => {
      const childPath = parts.slice(0, index + 1).join('/')
      const isLeaf = index === parts.length - 1
      let child = cursor.children.find((node) => node.name === part)

      if (!child) {
        child = {
          name: part,
          path: childPath,
          type: isLeaf ? 'file' : 'dir',
          children: []
        }
        cursor.children.push(child)
      }

      cursor = child
    })
  }

  const sortNode = (node) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1
      }

      return a.name.localeCompare(b.name)
    })

    node.children.forEach(sortNode)
  }

  sortNode(root)
  return root.children
}