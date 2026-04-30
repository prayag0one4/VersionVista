import create from 'zustand'

export const useTimelineStore = create((set)=>({
  commits: [],
  currentIndex: 0,
  isPlaying: false,
  speed: 1,
  setCommits: (c)=>set({commits: c}),
  setCurrentIndex: (i)=>set({currentIndex: i}),
  setPlaying: (b)=>set({isPlaying: b}),
  setSpeed: (s)=>set({speed: s})
}))
