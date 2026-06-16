import { create } from 'zustand';

export interface UIState {
  selectedRepoId: string | null;
  selectedFileId: string | null; // This will actually be the filepath, e.g., 'src/index.js'
  expandedFolders: Set<string>;
  
  selectRepo: (repoId: string | null) => void;
  selectFile: (fileId: string | null) => void;
  toggleFolder: (folderId: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedRepoId: null,
  selectedFileId: null,
  expandedFolders: new Set(),
  
  selectRepo: (repoId) => set({ selectedRepoId: repoId, selectedFileId: null, expandedFolders: new Set() }),
  selectFile: (fileId) => set({ selectedFileId: fileId }),
  toggleFolder: (folderId) => set((state) => {
    const newExpanded = new Set(state.expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    return { expandedFolders: newExpanded };
  }),
}));
