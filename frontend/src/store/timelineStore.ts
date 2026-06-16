import { create } from 'zustand';

export interface TimelineState {
  currentCommitIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // 0.5, 1, 2, 4
  showDiff: boolean; // global diff toggle
  
  setCurrentCommitIndex: (index: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  nextCommit: (max: number) => void;
  prevCommit: () => void;
  toggleDiff: () => void;
  setShowDiff: (show: boolean) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  currentCommitIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  showDiff: false,
  
  setCurrentCommitIndex: (index) => set({ currentCommitIndex: index }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ playbackSpeed: speed }),
  nextCommit: (max) => set((state) => ({ 
    currentCommitIndex: Math.min(state.currentCommitIndex + 1, max - 1) 
  })),
  prevCommit: () => set((state) => ({ 
    currentCommitIndex: Math.max(state.currentCommitIndex - 1, 0) 
  })),
  toggleDiff: () => set((state) => ({ showDiff: !state.showDiff })),
  setShowDiff: (show) => set({ showDiff: show }),
}));
