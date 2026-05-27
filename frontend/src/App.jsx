import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './lib/api'
import FileTree from './components/FileTree'
import CodeViewer from './components/CodeViewer'
import Timeline from './components/Timeline'
import { useTimelineStore } from './store/timelineStore'

const sortByTimestamp = (items = []) =>
  [...items].sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp))

const normalizeCommitLimit = (value) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    return 100
  }

  return Math.min(1000, Math.max(1, parsed))
}

export default function App() {
  const repos = useTimelineStore((state) => state.repos)
  const selectedRepoId = useTimelineStore((state) => state.selectedRepoId)
  const commitLimit = useTimelineStore((state) => state.commitLimit)
  const commits = useTimelineStore((state) => state.commits)
  const currentIndex = useTimelineStore((state) => state.currentIndex)
  const selectedFilePath = useTimelineStore((state) => state.selectedFilePath)
  const isPlaying = useTimelineStore((state) => state.isPlaying)
  const playbackSpeed = useTimelineStore((state) => state.playbackSpeed)
  const repoInputUrl = useTimelineStore((state) => state.repoInputUrl)
  const isLoading = useTimelineStore((state) => state.isLoading)
  const error = useTimelineStore((state) => state.error)
  const setRepos = useTimelineStore((state) => state.setRepos)
  const setSelectedRepoId = useTimelineStore((state) => state.setSelectedRepoId)
  const setCommitLimit = useTimelineStore((state) => state.setCommitLimit)
  const setCommits = useTimelineStore((state) => state.setCommits)
  const setCurrentIndex = useTimelineStore((state) => state.setCurrentIndex)
  const setSelectedFilePath = useTimelineStore((state) => state.setSelectedFilePath)
  const setPlaying = useTimelineStore((state) => state.setPlaying)
  const setPlaybackSpeed = useTimelineStore((state) => state.setPlaybackSpeed)
  const setRepoInputUrl = useTimelineStore((state) => state.setRepoInputUrl)
  const setLoading = useTimelineStore((state) => state.setLoading)
  const setError = useTimelineStore((state) => state.setError)

  const [stateCache, setStateCache] = useState({})
  const stateCacheRef = useRef({})
  const loadedHashesRef = useRef(new Set())
  const inFlightCommitLoadsRef = useRef(new Map())
  const inFlightFileLoadsRef = useRef(new Map())

  const selectedRepo = useMemo(
    () => repos.find((repo) => repo._id === selectedRepoId) || null,
    [repos, selectedRepoId]
  )

  const currentCommit = commits[currentIndex] || null
  const currentFiles = currentCommit ? stateCache[currentCommit.commitHash]?.filePaths || [] : []
  const currentFile =
    stateCache[currentCommit?.commitHash || '']?.fileContents?.[selectedFilePath] || null

  const fileHistory = useMemo(() => {
    if (!selectedFilePath) {
      return []
    }

    return commits.map((commit) => {
      const filePaths = stateCache[commit.commitHash]?.filePaths || []
      const file = stateCache[commit.commitHash]?.fileContents?.[selectedFilePath] || null

      return {
        commitHash: commit.commitHash,
        message: commit.message,
        timestamp: commit.timestamp,
        exists: filePaths.includes(selectedFilePath),
        content: file?.content || ''
      }
    })
  }, [commits, selectedFilePath, stateCache])

  const loadCommitState = useCallback(
    async (repoId, commitHash, force = false) => {
      if (!repoId || !commitHash) {
        return null
      }

      if (!force && loadedHashesRef.current.has(commitHash)) {
        return stateCacheRef.current[commitHash] || null
      }

      const inFlight = inFlightCommitLoadsRef.current.get(commitHash)
      if (inFlight) {
        return inFlight
      }

      const request = (async () => {
        const response = await api.getCommitPaths(repoId, commitHash)
        const filePaths = Array.isArray(response?.filePaths) ? response.filePaths : []

        loadedHashesRef.current.add(commitHash)
        stateCacheRef.current = {
          ...stateCacheRef.current,
          [commitHash]: {
            commitHash,
            filePaths,
            fileContents: stateCacheRef.current[commitHash]?.fileContents || {}
          }
        }

        setStateCache((previous) => ({
          ...previous,
          [commitHash]: {
            commitHash,
            filePaths,
            fileContents: previous[commitHash]?.fileContents || {}
          }
        }))

        return { commitHash, filePaths }
      })()

      inFlightCommitLoadsRef.current.set(commitHash, request)

      try {
        return await request
      } finally {
        inFlightCommitLoadsRef.current.delete(commitHash)
      }
    },
    []
  )

  const loadFileContent = useCallback(async (repoId, commitHash, filePath) => {
    if (!repoId || !commitHash || !filePath) {
      return null
    }

    const cached = stateCacheRef.current[commitHash]?.fileContents?.[filePath]
    if (cached) {
      return cached
    }

    const requestKey = `${commitHash}:${filePath}`
    const inFlight = inFlightFileLoadsRef.current.get(requestKey)
    if (inFlight) {
      return inFlight
    }

    const request = (async () => {
      const response = await api.getCommitFile(repoId, commitHash, filePath)
      const content = response?.content || ''

      stateCacheRef.current = {
        ...stateCacheRef.current,
        [commitHash]: {
          ...stateCacheRef.current[commitHash],
          fileContents: {
            ...(stateCacheRef.current[commitHash]?.fileContents || {}),
            [filePath]: { filePath, content }
          }
        }
      }

      setStateCache((previous) => ({
        ...previous,
        [commitHash]: {
          ...previous[commitHash],
          fileContents: {
            ...(previous[commitHash]?.fileContents || {}),
            [filePath]: { filePath, content }
          }
        }
      }))

      return { filePath, content }
    })()

    inFlightFileLoadsRef.current.set(requestKey, request)

    try {
      return await request
    } finally {
      inFlightFileLoadsRef.current.delete(requestKey)
    }
  }, [])

  const loadRepos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.listRepos()
      const items = response?.data || []
      setRepos(items)

      const activeSelectedRepoId = useTimelineStore.getState().selectedRepoId

      if (!activeSelectedRepoId && items.length > 0) {
        setSelectedRepoId(items[0]._id)
      }
    } catch (fetchError) {
      setError(fetchError.message)
    } finally {
      setLoading(false)
    }
  }, [setError, setLoading, setRepos, setSelectedRepoId])

  const loadCommits = useCallback(
    async (repoId, limitValue = commitLimit) => {
      try {
        setLoading(true)
        setError(null)
        loadedHashesRef.current = new Set()

        const limit = normalizeCommitLimit(limitValue)

        const response = await api.listCommits(repoId, limit)
        const ordered = sortByTimestamp(response?.data || [])

        setCommits(ordered)
        setCurrentIndex(0)

        if (ordered.length > 0) {
          const initialState = await loadCommitState(repoId, ordered[0].commitHash, true)
          if (initialState?.filePaths?.length) {
            setSelectedFilePath(initialState.filePaths[0])
          }
        }
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setLoading(false)
      }
    },
    [commitLimit, loadCommitState, setCommits, setCurrentIndex, setError, setLoading]
  )

  const handleRepoSelect = useCallback(
    (repoId) => {
      setSelectedRepoId(repoId || null)
      setPlaying(false)
    },
    [setPlaying, setSelectedRepoId]
  )

  const handleAnalyzeRepo = useCallback(async () => {
    const trimmedUrl = repoInputUrl.trim()

    if (!trimmedUrl) {
      setError('Enter a GitHub repository URL first.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await api.fetchRepo(trimmedUrl, commitLimit)
      const analyzedRepoId = response?.data?.repoId || null

      if (analyzedRepoId) {
        setSelectedRepoId(analyzedRepoId)
      }

      await loadRepos()
    } catch (fetchError) {
      setError(fetchError.message)
    } finally {
      setLoading(false)
    }
  }, [commitLimit, loadRepos, repoInputUrl, setError, setLoading, setSelectedRepoId])

  const handleCommitLimitChange = useCallback(
    (value) => {
      setCommitLimit(normalizeCommitLimit(value))
    },
    [setCommitLimit]
  )

  useEffect(() => {
    loadRepos()
  }, [])

  useEffect(() => {
    if (selectedRepoId) {
      loadCommits(selectedRepoId, commitLimit)
    } else {
      setCommits([])
      setCurrentIndex(0)
      setSelectedFilePath(null)
      setStateCache({})
      stateCacheRef.current = {}
      loadedHashesRef.current = new Set()
    }
  }, [commitLimit, selectedRepoId, loadCommits, setCommits, setCurrentIndex, setSelectedFilePath])

  useEffect(() => {
    if (!selectedRepoId || commits.length === 0) {
      return undefined
    }

    const commitsToLoad = [
      currentIndex,
      Math.max(0, currentIndex - 1),
      Math.min(commits.length - 1, currentIndex + 1)
    ]
      .map((index) => commits[index])
      .filter(Boolean)

    let cancelled = false

    ;(async () => {
      for (const commit of commitsToLoad) {
        if (cancelled) {
          return
        }

        try {
          await loadCommitState(selectedRepoId, commit.commitHash)
        } catch (fetchError) {
          setError(fetchError.message)
          return
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [commits, currentIndex, loadCommitState, selectedRepoId, setError])

  useEffect(() => {
    if (!selectedRepoId || !selectedFilePath || commits.length === 0) {
      return undefined
    }

    let cancelled = false
    let loadIdx = 0

    const loadNextFile = async () => {
      if (cancelled || loadIdx >= commits.length) {
        return
      }

      const commit = commits[loadIdx]
      loadIdx += 1

      try {
        if (!loadedHashesRef.current.has(commit.commitHash)) {
          await loadCommitState(selectedRepoId, commit.commitHash)
        }

        const filePaths = stateCacheRef.current[commit.commitHash]?.filePaths || []
        if (filePaths.includes(selectedFilePath) && !stateCacheRef.current[commit.commitHash]?.fileContents?.[selectedFilePath]) {
          await loadFileContent(selectedRepoId, commit.commitHash, selectedFilePath)
        }
      } catch (fetchError) {
        setError(fetchError.message)
      }

      requestAnimationFrame(() => {
        if (!cancelled) {
          loadNextFile()
        }
      })
    }

    loadNextFile()

    return () => {
      cancelled = true
    }
  }, [commits, loadCommitState, loadFileContent, selectedFilePath, selectedRepoId, setError])

  useEffect(() => {
    if (!currentFiles.length) {
      return
    }

    const selectedStillExists = selectedFilePath
      ? currentFiles.includes(selectedFilePath)
      : false

    if (!selectedStillExists) {
      setSelectedFilePath(currentFiles[0])
    }
  }, [currentFiles, selectedFilePath, setSelectedFilePath])

  const handleSeek = useCallback(
    (nextIndex) => {
      setCurrentIndex(nextIndex)
    },
    [setCurrentIndex]
  )

  const handleOpenFile = useCallback(
    (filePath) => {
      setSelectedFilePath(filePath)
    },
    [setSelectedFilePath]
  )

  const togglePlayback = useCallback(() => {
    setPlaying((playing) => !playing)
  }, [setPlaying])

  return (
    <div className="h-screen flex flex-col bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,#111827_0%,#09090b_100%)] text-zinc-100 overflow-hidden">
      <header className="border-b border-white/10 bg-white/5 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur flex-shrink-0">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.32em] text-sky-300/80">
              VersionVista
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-white whitespace-nowrap">
              Repository Evolution Replay
            </h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:gap-3 md:min-w-fit">
            <div className="flex gap-1.5">
              <div className="flex items-center gap-1 rounded border border-white/10 bg-[#0f172a] px-2 py-1.5">
                <span className="text-[10px] text-zinc-400">Commits</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={commitLimit}
                  onChange={(event) => handleCommitLimitChange(event.target.value)}
                  className="w-16 bg-transparent text-right text-xs text-zinc-100 outline-none"
                />
              </div>

              <select
                value={selectedRepoId || ''}
                onChange={(event) => handleRepoSelect(event.target.value)}
                className="min-w-40 rounded border border-white/10 bg-[#0f172a] px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-sky-500"
              >
                <option value="">Select repo</option>
                {repos.map((repo) => (
                  <option key={repo._id} value={repo._id}>
                    {repo.owner}/{repo.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={loadRepos}
                className="rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            <div className="flex gap-1.5">
              <input
                value={repoInputUrl}
                onChange={(event) => setRepoInputUrl(event.target.value)}
                placeholder="GitHub URL"
                className="min-w-0 flex-1 rounded border border-white/10 bg-[#0f172a] px-2 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-sky-500"
              />

              <button
                type="button"
                onClick={handleAnalyzeRepo}
                className="rounded bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Analyze'}
              </button>
            </div>
            </div>
        </div>
        {error && (
          <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-100">
            {error}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 grid gap-0 xl:grid-cols-[240px_minmax(0,1fr)_260px] bg-[#1e1e1e] border-t border-white/10 overflow-hidden">
          <aside className="flex flex-col min-h-0 border-r border-white/10 bg-[#252526]">
            <div className="border-b border-white/10 px-3 py-2 flex-shrink-0">
              <div className="text-[9px] uppercase tracking-[0.32em] text-zinc-500 font-semibold">Explorer</div>
              <div className="mt-1.5 text-xs text-zinc-300 truncate font-medium">
                {selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : 'No repo'}
              </div>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              <FileTree
                files={currentFiles}
                selectedFilePath={selectedFilePath}
                onSelectFile={handleOpenFile}
              />
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden bg-[#1e1e1e]">
            <div className="flex-1 min-h-0 overflow-auto">
              <CodeViewer
                selectedFilePath={selectedFilePath}
                currentCommit={currentCommit}
                currentFile={currentFile}
                fileHistory={fileHistory}
                onSeek={(index) => handleSeek(index)}
              />
            </div>

            <div className="border-t border-white/10 bg-[#252526] p-3 flex-shrink-0">
              <Timeline
                commits={commits}
                currentIndex={currentIndex}
                onSeek={handleSeek}
                isPlaying={isPlaying}
                onTogglePlay={togglePlayback}
                speed={playbackSpeed}
                onSpeedChange={setPlaybackSpeed}
              />
            </div>
          </main>

          <aside className="flex flex-col min-h-0 border-l border-white/10 bg-[#252526]">
            <div className="border-b border-white/10 px-3 py-2 flex-shrink-0">
              <div className="text-[9px] uppercase tracking-[0.32em] text-zinc-500 font-semibold">Timeline</div>
              <div className="mt-1.5 text-xs text-zinc-300 font-medium">Commit info</div>
            </div>

            <div className="flex-1 overflow-auto min-h-0 space-y-2 p-2.5 text-xs text-zinc-300">
              <div className="rounded border border-white/10 bg-white/5 p-2.5">
                <div className="text-[8px] uppercase tracking-[0.28em] text-zinc-500 font-semibold">Hash</div>
                <div className="mt-1.5 font-mono text-[9px] text-zinc-100 break-all">
                  {currentCommit ? currentCommit.commitHash.slice(0, 12) : '—'}
                </div>
              </div>

              <div className="rounded border border-white/10 bg-white/5 p-2.5">
                <div className="text-[8px] uppercase tracking-[0.28em] text-zinc-500 font-semibold">Message</div>
                <div className="mt-1.5 text-[9px] text-zinc-300 line-clamp-3">
                  {currentCommit?.message || 'Select repository'}
                </div>
              </div>

              <div className="rounded border border-white/10 bg-white/5 p-2.5">
                <div className="text-[8px] uppercase tracking-[0.28em] text-zinc-500 font-semibold">Repository</div>
                <div className="mt-1.5 text-[9px] text-white font-medium">
                  {selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : '—'}
                </div>
                <div className="mt-0.5 text-[8px] text-zinc-500">{commits.length} commits</div>
              </div>

              <div className="rounded border border-white/10 bg-white/5 p-2.5 text-[8px] text-zinc-400 leading-relaxed">
                Track repository commits over time with live code replay.
              </div>
            </div>
          </aside>
      </div>
    </div>
  )
}
