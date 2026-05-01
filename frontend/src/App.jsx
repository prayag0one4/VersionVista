import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './lib/api'
import FileTree from './components/FileTree'
import CodeViewer from './components/CodeViewer'
import Timeline from './components/Timeline'
import { useTimelineStore } from './store/timelineStore'

const sortByTimestamp = (items = []) =>
  [...items].sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp))

export default function App() {
  const repos = useTimelineStore((state) => state.repos)
  const selectedRepoId = useTimelineStore((state) => state.selectedRepoId)
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
    async (repoId) => {
      try {
        setLoading(true)
        setError(null)
        loadedHashesRef.current = new Set()

        const response = await api.listCommits(repoId, 100)
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
    [loadCommitState, setCommits, setCurrentIndex, setError, setLoading]
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

      await api.fetchRepo(trimmedUrl)
      await loadRepos()
    } catch (fetchError) {
      setError(fetchError.message)
    } finally {
      setLoading(false)
    }
  }, [loadRepos, repoInputUrl, setError, setLoading])

  useEffect(() => {
    loadRepos()
  }, [])

  useEffect(() => {
    if (selectedRepoId) {
      loadCommits(selectedRepoId)
    } else {
      setCommits([])
      setCurrentIndex(0)
      setSelectedFilePath(null)
      setStateCache({})
      stateCacheRef.current = {}
      loadedHashesRef.current = new Set()
    }
  }, [selectedRepoId, loadCommits, setCommits, setCurrentIndex, setSelectedFilePath])

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

    ;(async () => {
      for (const commit of commits) {
        if (cancelled) {
          return
        }

        if (!loadedHashesRef.current.has(commit.commitHash)) {
          try {
            await loadCommitState(selectedRepoId, commit.commitHash)
          } catch (fetchError) {
            setError(fetchError.message)
            return
          }
        }

        const filePaths = stateCacheRef.current[commit.commitHash]?.filePaths || []
        if (filePaths.includes(selectedFilePath) && !stateCacheRef.current[commit.commitHash]?.fileContents?.[selectedFilePath]) {
          try {
            await loadFileContent(selectedRepoId, commit.commitHash, selectedFilePath)
          } catch (fetchError) {
            setError(fetchError.message)
            return
          }
        }
      }
    })()

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
      setPlaying(false)
      setCurrentIndex(nextIndex)
    },
    [setCurrentIndex, setPlaying]
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,#111827_0%,#09090b_100%)] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 p-4">
        <header className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.36em] text-sky-300/80">
                VersionVista
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                Repository Evolution Replay
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                Browse commits, play the history, and inspect how each file changes over time through the backend snapshot API.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[540px]">
              <div className="flex gap-2">
                <select
                  value={selectedRepoId || ''}
                  onChange={(event) => handleRepoSelect(event.target.value)}
                  className="min-w-48 flex-1 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
                >
                  <option value="">Select a repository</option>
                  {repos.map((repo) => (
                    <option key={repo._id} value={repo._id}>
                      {repo.owner}/{repo.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={loadRepos}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
                >
                  Refresh
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  value={repoInputUrl}
                  onChange={(event) => setRepoInputUrl(event.target.value)}
                  placeholder="Paste a GitHub repository URL to analyze"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-sky-500"
                />

                <button
                  type="button"
                  onClick={handleAnalyzeRepo}
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}
        </header>

        <div className="grid flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]/90 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.32em] text-zinc-500">Explorer</div>
              <div className="mt-1 text-sm text-zinc-300">
                {selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : 'No repository selected'}
              </div>
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-auto p-3">
              <FileTree
                files={currentFiles}
                selectedFilePath={selectedFilePath}
                onSelectFile={handleOpenFile}
              />
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101827]/90 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex-1 min-h-[520px]">
              <CodeViewer
                selectedFilePath={selectedFilePath}
                currentCommit={currentCommit}
                currentFile={currentFile}
                fileHistory={fileHistory}
                onSeek={(index) => handleSeek(index)}
              />
            </div>

            <div className="border-t border-white/10 p-4">
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

          <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]/90 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.32em] text-zinc-500">Inspector</div>
              <div className="mt-1 text-sm text-zinc-300">Playback details</div>
            </div>

            <div className="space-y-4 p-4 text-sm text-zinc-300">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">Current commit</div>
                <div className="mt-2 font-medium text-white">
                  {currentCommit ? currentCommit.commitHash : 'No commit selected'}
                </div>
                <div className="mt-1 text-zinc-400">{currentCommit?.message || 'Load a repository to begin.'}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">Repository</div>
                <div className="mt-2 font-medium text-white">
                  {selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : 'None'}
                </div>
                <div className="mt-1 text-zinc-400">Commits loaded: {commits.length}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-zinc-400">
                The UI connects directly to the backend routes under <span className="text-zinc-200">/api</span>,
                including repo analysis, commit listing, and commit-state reconstruction.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
