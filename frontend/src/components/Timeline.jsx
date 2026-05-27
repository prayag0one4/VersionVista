import React, { useEffect, useMemo, useRef } from 'react'

const SPEEDS = [0.5, 1, 1.5, 2]

const Timeline = ({ commits, currentIndex, onSeek, isPlaying, onTogglePlay, speed, onSpeedChange }) => {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isPlaying || commits.length < 2) {
      return undefined
    }

    timerRef.current = window.setInterval(() => {
      onSeek((value) => Math.min(value + 1, commits.length - 1))
    }, Math.max(200, 800 / speed))

    return () => window.clearInterval(timerRef.current)
  }, [isPlaying, speed, commits.length, onSeek])

  const currentCommit = commits[currentIndex] || null
  const progress = commits.length > 1 ? (currentIndex / (commits.length - 1)) * 100 : 0

  const markers = useMemo(
    () =>
      commits.map((commit, index) => ({
        commit,
        index,
        isActive: index === currentIndex
      })),
    [commits, currentIndex]
  )

  return (
    <div className="space-y-2 text-zinc-200">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={onTogglePlay}
          className="rounded px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition flex-shrink-0"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <div className="text-xs text-zinc-400 truncate flex-1 font-mono min-w-0">
          {currentCommit ? `${currentCommit.commitHash.slice(0, 8)} • ${currentCommit.message}` : 'No commit'}
        </div>

        <div className="flex items-center gap-1 text-xs text-zinc-500 flex-shrink-0">
          <span className="text-zinc-600 text-[10px]">Speed:</span>
          {SPEEDS.map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => onSpeedChange(value)}
              className={`rounded px-1 py-0.5 text-[10px] transition ${
                speed === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="relative h-1 rounded-full bg-white/10 cursor-pointer group">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-blue-500 group-hover:bg-blue-400 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={Math.max(0, commits.length - 1)}
            value={currentIndex}
            onChange={(event) => onSeek(Number(event.target.value))}
            className="absolute inset-0 w-full h-1 cursor-pointer appearance-none bg-transparent"
          />
        </div>

        <div className="text-xs text-zinc-500 flex justify-between">
          <span>{currentIndex + 1}</span>
          <span>{commits.length}</span>
        </div>
      </div>
    </div>
  )
}

export default Timeline
