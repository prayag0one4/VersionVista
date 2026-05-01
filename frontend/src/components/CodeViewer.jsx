import React, { useMemo } from 'react'

const getLines = (content = '') => content.split('\n')

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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1e1e1e] text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#252526] px-4 py-3 text-sm">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Editor</div>
          <div className="mt-1 font-medium text-zinc-100">
            {selectedFilePath || 'No file selected'}
          </div>
        </div>

        <div className="text-right text-xs text-zinc-400">
          {currentCommit ? (
            <>
              <div>{currentCommit.commitHash?.slice(0, 10)}</div>
              <div className="max-w-56 truncate">{currentCommit.message}</div>
            </>
          ) : (
            'Select a repository to begin'
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {currentFile ? (
          <div
            key={`${currentCommit?.commitHash || 'no-commit'}:${selectedFilePath || 'none'}`}
            className="grid grid-cols-[auto_1fr] gap-x-4 px-4 py-4 font-mono text-[13px] leading-6 transition-opacity duration-200"
          >
            <div className="select-none text-right text-zinc-500">
              {currentLines.map((_, lineIndex) => (
                <div key={lineIndex}>{lineIndex + 1}</div>
              ))}
            </div>
            <pre className="whitespace-pre-wrap break-words text-zinc-100">
              {currentLines.join('\n')}
            </pre>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-500">
            {selectedFilePath
              ? 'Loading file content from the backend...'
              : 'Pick a file in the explorer to inspect its evolution.'}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-[#202020] px-4 py-3">
        <div className="mb-2 text-xs uppercase tracking-[0.28em] text-zinc-500">
          File Playback
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {historyWithContent.map((entry, index) => (
            <button
              type="button"
              key={`${entry.commitHash}-${index}`}
              onClick={() => onSeek(index)}
              className={`min-w-32 rounded border px-3 py-2 text-left text-xs transition ${
                entry.exists
                  ? entry.changed
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                    : 'border-white/10 bg-white/5 text-zinc-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              }`}
            >
              <div className="font-medium">{entry.commitHash.slice(0, 8)}</div>
              <div className="truncate opacity-80">{entry.message}</div>
            </button>
          ))}
          {!historyWithContent.length && (
            <div className="rounded border border-dashed border-white/10 px-3 py-2 text-xs text-zinc-500">
              Open a file to see its timeline playback.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CodeViewer
