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
    }, Math.max(220, 900 / speed))

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
    <div className="rounded-xl border border-white/10 bg-[#202020] p-4 text-zinc-200 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <div className="rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-400">
          {currentCommit ? `${currentCommit.commitHash.slice(0, 10)} • ${currentCommit.message}` : 'No commit loaded'}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
          <span>Speed</span>
          {SPEEDS.map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => onSpeedChange(value)}
              className={`rounded-full border px-2.5 py-1 transition ${
                speed === value
                  ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="relative h-2 rounded-full bg-white/8">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={Math.max(0, commits.length - 1)}
            value={currentIndex}
            onChange={(event) => onSeek(Number(event.target.value))}
            className="absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {markers.map(({ commit, index, isActive }) => (
            <button
              type="button"
              key={commit.commitHash}
              onClick={() => onSeek(index)}
              className={`min-w-28 rounded-md border px-3 py-2 text-left text-xs transition ${
                isActive
                  ? 'border-sky-500 bg-sky-500/15 text-sky-100'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
              title={commit.message}
            >
              <div className="font-medium text-[11px]">{commit.commitHash.slice(0, 8)}</div>
              <div className="truncate opacity-80">{commit.message}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Timeline
