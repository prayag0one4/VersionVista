import React, { useEffect, useMemo, useState } from 'react'
import { buildTree } from '../utils/tree'

const TreeNode = ({ node, depth, expanded, onToggle, onSelectFile, selectedFilePath }) => {
  const isDir = node.type === 'dir'
  const isSelected = node.path === selectedFilePath

  if (isDir) {
    const isOpen = expanded.has(node.path)

    return (
      <div>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs text-zinc-300 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          <span className="text-xs w-4 text-center text-zinc-600">{isOpen ? '▼' : '▶'}</span>
          <span className="truncate font-medium">{node.name || 'root'}</span>
        </button>

        <div className="overflow-hidden transition-all duration-200">
          {isOpen &&
            node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                onSelectFile={onSelectFile}
                selectedFilePath={selectedFilePath}
              />
            ))}
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.path)}
      className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs transition-colors ${
        isSelected 
          ? 'bg-blue-600/30 text-blue-200' 
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <span className="text-xs w-4 text-center text-zinc-600 flex-shrink-0">📄</span>
      <span className="truncate">{node.name}</span>
    </button>
  )
}

const FileTree = ({ files = [], selectedFilePath, onSelectFile }) => {
  const tree = useMemo(() => buildTree(files), [files])
  const [expanded, setExpanded] = useState(() => new Set())

  useEffect(() => {
    if (tree.length === 0) {
      setExpanded(new Set())
      return
    }

    setExpanded((previous) => {
      if (previous.size > 0) {
        return previous
      }

      return new Set(tree.filter((node) => node.type === 'dir').map((node) => node.path))
    })
  }, [tree])

  const toggle = (path) => {
    setExpanded((previous) => {
      const next = new Set(previous)

      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }

      return next
    })
  }

  return (
    <div className="space-y-px text-xs">
      {tree.length ? (
        tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onSelectFile={onSelectFile}
            selectedFilePath={selectedFilePath}
          />
        ))
      ) : (
        <div className="px-2 py-6 text-center text-xs text-zinc-600">
          Open a repository
        </div>
      )}
    </div>
  )
}

export default FileTree
