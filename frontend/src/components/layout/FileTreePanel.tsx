import { useQuery } from '@tanstack/react-query';
import { api, RepositoryState, Commit } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useTimelineStore } from '@/store/timelineStore';
import { File, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useMemo, useCallback } from 'react';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
}

function buildTree(files: { filePath: string }[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.filePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.push({ name: part, path: file.filePath, type: 'file', children: [] });
      } else {
        let folder = current.find(n => n.name === part && n.type === 'folder') as TreeNode | undefined;
        if (!folder) {
          folder = { name: part, path: parts.slice(0, i + 1).join('/'), type: 'folder', children: [] };
          current.push(folder);
        }
        current = folder.children;
      }
    }
  }

  return root.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function TreeItem({
  node,
  depth,
  selectedFileId,
  expandedFolders,
  onSelectFile,
  onToggleFolder,
}: {
  node: TreeNode;
  depth: number;
  selectedFileId: string | null;
  expandedFolders: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFileId === node.path;

  if (node.type === 'file') {
    return (
      <button
        onClick={() => onSelectFile(node.path)}
        className={`w-full flex items-center gap-1.5 px-2 py-0.5 text-[13px] rounded transition-colors text-left truncate font-mono ${
          isSelected ? 'bg-[#adc6ff]/10 text-[#adc6ff]' : 'text-[#c4c6d0] hover:bg-[#111111] hover:text-[#e3e2e7]'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="w-3 shrink-0" />
        <File className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#adc6ff]' : 'text-[#8e909a]'}`} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => onToggleFolder(node.path)}
        className={`w-full flex items-center gap-1.5 px-2 py-0.5 text-[13px] rounded transition-colors text-left truncate font-mono ${
          isSelected ? 'bg-[#adc6ff]/10 text-[#adc6ff]' : 'text-[#c4c6d0] hover:bg-[#111111] hover:text-[#e3e2e7]'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#8e909a]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#8e909a]" />
        )}
        <Folder className="w-3.5 h-3.5 shrink-0 text-[#c0c1ff]" />
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {isExpanded && node.children.map(child => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedFileId={selectedFileId}
          expandedFolders={expandedFolders}
          onSelectFile={onSelectFile}
          onToggleFolder={onToggleFolder}
        />
      ))}
    </>
  );
}

export function FileTreePanel() {
  const { selectedRepoId, selectedFileId, selectFile, expandedFolders, toggleFolder } = useUIStore();
  const { currentCommitIndex } = useTimelineStore();

  const { data: commits } = useQuery({
    queryKey: ['commits', selectedRepoId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Commit[] }>(`/commits?repoId=${selectedRepoId}&limit=1000`);
      return (res.data.data || []).reverse();
    },
    enabled: !!selectedRepoId,
  });

  const currentCommit = commits?.[currentCommitIndex];

  const { data: repoState, isLoading: stateLoading, isError: stateError } = useQuery({
    queryKey: ['repoState', selectedRepoId, currentCommit?.commitHash],
    queryFn: async () => {
      const res = await api.get<RepositoryState>(`/code-snapshots/${selectedRepoId}/state/${currentCommit?.commitHash}`);
      return res.data;
    },
    enabled: !!selectedRepoId && !!currentCommit?.commitHash,
    retry: 2,
    staleTime: 30_000,
  });

  const tree = useMemo(() => repoState?.files ? buildTree(repoState.files) : [], [repoState]);

  const handleSelectFile = useCallback((path: string) => {
    selectFile(path);
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/');
      if (!expandedFolders.has(folderPath)) {
        toggleFolder(folderPath);
      }
    }
  }, [selectFile, expandedFolders, toggleFolder]);

  if (!commits) {
    return (
      <div className="flex flex-col h-full bg-transparent">
        <div className="px-4 py-2 font-semibold text-xs tracking-wider text-[#8e909a] uppercase shrink-0 border-b border-[#222222]">
          Explorer
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-4 bg-[#222222] rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (stateError) {
    return (
      <div className="flex flex-col h-full bg-transparent">
        <div className="px-4 py-2 font-semibold text-xs tracking-wider text-[#8e909a] uppercase shrink-0 border-b border-[#222222]">
          Explorer
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#ffb4ab]">
            <span className="text-sm font-sans">Failed to load files</span>
          </div>
        </div>
      </div>
    );
  }

  if (stateLoading || !repoState || tree.length === 0) {
    return (
      <div className="flex flex-col h-full bg-transparent">
        <div className="px-4 py-2 font-semibold text-xs tracking-wider text-[#8e909a] uppercase shrink-0 border-b border-[#222222]">
          Explorer
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#8e909a]">
            <div className="w-4 h-4 border-2 border-[#adc6ff] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-sans">Loading files...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-4 py-2 font-semibold text-xs tracking-wider text-[#8e909a] uppercase shrink-0 border-b border-[#222222]">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 py-2">
        <div>
          {tree.map(node => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedFileId={selectedFileId}
              expandedFolders={expandedFolders}
              onSelectFile={handleSelectFile}
              onToggleFolder={toggleFolder}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
