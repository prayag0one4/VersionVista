import { create } from 'zustand'

export const useTimelineStore = create((set) => ({
  repos: [],
  selectedRepoId: null,
  commitLimit: 100,
  commits: [],
  currentIndex: 0,
  selectedFilePath: null,
  isPlaying: false,
  playbackSpeed: 1,
  repoInputUrl: '',
  isLoading: false,
  error: null,
  setRepos: (repos) => set({ repos }),
  setSelectedRepoId: (selectedRepoId) =>
    set({
      selectedRepoId,
      commits: [],
      currentIndex: 0,
      selectedFilePath: null,
      isPlaying: false,
      error: null
    }),
  setCommitLimit: (commitLimit) => set({ commitLimit }),
  setCommits: (commits) =>
    set({
      commits,
      currentIndex: 0,
      selectedFilePath: null
    }),
  setCurrentIndex: (nextIndex) =>
    set((state) => ({
      currentIndex:
        typeof nextIndex === 'function' ? nextIndex(state.currentIndex) : nextIndex
    })),
  setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),
  setPlaying: (nextPlaying) =>
    set((state) => ({
      isPlaying: typeof nextPlaying === 'function' ? nextPlaying(state.isPlaying) : nextPlaying
    })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setRepoInputUrl: (repoInputUrl) => set({ repoInputUrl }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error })
}))
