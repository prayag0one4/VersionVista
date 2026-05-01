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
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm text-zinc-300 hover:bg-white/5"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <span className="text-[10px] text-zinc-500">{isOpen ? '▾' : '▸'}</span>
          <span className="truncate">{node.name || 'root'}</span>
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
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition ${
        isSelected ? 'bg-sky-500/20 text-sky-200' : 'text-zinc-300 hover:bg-white/5'
      }`}
      style={{ paddingLeft: `${depth * 14 + 18}px` }}
    >
      <span className="text-[10px] text-zinc-500">⌁</span>
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
    <div className="space-y-1 text-xs">
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
        <div className="rounded border border-dashed border-white/10 px-3 py-4 text-sm text-zinc-500">
          Open a repository to see its file tree.
        </div>
      )}
    </div>
  )
}

export default FileTree
