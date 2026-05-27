import React, { useMemo } from 'react'

const getLines = (content = '') => content.split('\n')

// Simple diff algorithm to identify added and removed lines
const computeLineDiff = (previousContent, currentContent) => {
  const prevLines = getLines(previousContent)
  const currLines = getLines(currentContent)
  
  const lineStatus = currLines.map((line, index) => {
    if (index >= prevLines.length) return 'added'
    if (prevLines[index] !== line) return 'modified'
    return 'unchanged'
  })
  
  // Mark removed lines (lines that existed before but not now)
  const prevLineStatus = prevLines.map((line, index) => {
    if (index >= currLines.length) return 'removed'
    return 'unchanged'
  })
  
  return { lineStatus, removedCount: prevLines.length - currLines.length }
}

const CodeViewer = ({ selectedFilePath, currentCommit, currentFile, fileHistory = [], onSeek }) => {
  const currentLines = useMemo(() => getLines(currentFile?.content || ''), [currentFile?.content])

  const historyWithContent = useMemo(() => {
    return fileHistory.map((entry, index) => {
      const previous = fileHistory[index - 1]
      const changed = previous ? previous.content !== entry.content : true

      return {
        ...entry,
        changed
      }
    })
  }, [fileHistory])

  // Compute diff between current and previous file
  const lineStatus = useMemo(() => {
    if (fileHistory.length === 0) return []
    
    const currentIndex = fileHistory.findIndex(
      (entry) => entry.commitHash === currentCommit?.commitHash
    )
    
    if (currentIndex <= 0) return currentLines.map(() => 'unchanged')
    
    const previousContent = fileHistory[currentIndex - 1]?.content || ''
    const currentContent = currentFile?.content || ''
    const { lineStatus } = computeLineDiff(previousContent, currentContent)
    
    return lineStatus
  }, [currentFile?.content, fileHistory, currentCommit?.commitHash])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1e1e1e] text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#252526] px-2.5 py-1.5 text-xs flex-shrink-0">
        <div className="min-w-0">
          <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider truncate">
            {selectedFilePath ? selectedFilePath.split('/').pop() : 'no file'}
          </div>
          <div className="text-[10px] text-zinc-400">
            {selectedFilePath ? `${currentLines.length} lines` : ''}
          </div>
        </div>

        <div className="text-right text-[9px] text-zinc-500 ml-2 whitespace-nowrap flex-shrink-0">
          {currentCommit ? (
            <>
              <div className="font-mono text-zinc-300">{currentCommit.commitHash?.slice(0, 8)}</div>
              <div className="max-w-40 truncate text-zinc-500 text-[8px]">{currentCommit.message}</div>
            </>
          ) : (
            'Select repo'
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto w-full min-h-0">
        {currentFile ? (
          <div
            key={`${currentCommit?.commitHash || 'no-commit'}:${selectedFilePath || 'none'}`}
            className="font-mono text-[11px] leading-snug transition-opacity duration-200 w-full"
          >
            {currentLines.map((line, lineIndex) => {
              const status = lineStatus[lineIndex] || 'unchanged'
              const bgColor = 
                status === 'added' ? 'bg-green-900/20 hover:bg-green-900/30' :
                status === 'modified' ? 'bg-yellow-900/20 hover:bg-yellow-900/30' :
                'hover:bg-white/5'
              
              const lineNumberColor = 
                status === 'added' ? 'text-green-600' :
                status === 'modified' ? 'text-yellow-600' :
                'text-zinc-600'

              return (
                <div 
                  key={lineIndex}
                  className={`flex gap-x-3 px-3 py-px ${bgColor} transition-colors`}
                >
                  <div className={`select-none text-right min-w-10 flex-shrink-0 ${lineNumberColor} bg-[#1e1e1e]`}>
                    {lineIndex + 1}
                  </div>
                  <pre className="flex-1 whitespace-pre-wrap break-words text-zinc-100 bg-transparent min-w-0">
                    {line}
                  </pre>
                  {status !== 'unchanged' && (
                    <div className={`text-[9px] px-1.5 py-0 rounded flex items-center flex-shrink-0 ${
                      status === 'added' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {status === 'added' ? '+' : '~'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-zinc-500">
            {selectedFilePath
              ? 'Loading...'
              : 'Pick a file'}
          </div>
        )}
      </div>

      {historyWithContent.length > 0 && (
        <div className="border-t border-white/10 bg-[#252526] px-2.5 py-1.5 flex-shrink-0 overflow-x-auto">
          <div className="text-[7px] uppercase tracking-wide text-zinc-600 font-semibold whitespace-nowrap mb-1">
            History
          </div>

          <div className="flex gap-1 pb-0.5">
            {historyWithContent.map((entry, index) => (
              <button
                type="button"
                key={`${entry.commitHash}-${index}`}
                onClick={() => onSeek(index)}
                className={`min-w-20 rounded px-1.5 py-1 text-[8px] transition-colors flex-shrink-0 ${
                  entry.exists
                    ? entry.changed
                      ? 'border border-blue-500/50 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25'
                      : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                    : 'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                }`}
              >
                <div className="font-mono">{entry.commitHash.slice(0, 6)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CodeViewer
