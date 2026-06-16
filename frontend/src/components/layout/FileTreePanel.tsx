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
        className={`w-full flex items-center gap-1.5 px-2 py-0.5 text-sm rounded-sm transition-colors text-left truncate ${
          isSelected ? 'bg-blue-600/20 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="w-4 shrink-0" />
        <File className="w-4 h-4 shrink-0 text-zinc-500" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => onToggleFolder(node.path)}
        className={`w-full flex items-center gap-1.5 px-2 py-0.5 text-sm rounded-sm transition-colors text-left truncate ${
          isSelected ? 'bg-blue-600/20 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-zinc-500" />
        )}
        <Folder className="w-4 h-4 shrink-0 text-blue-400" />
        <span className="truncate font-medium text-zinc-300">{node.name}</span>
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
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 font-semibold text-xs tracking-wider text-zinc-500 uppercase shrink-0">
          Explorer
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-4 bg-zinc-800/50 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (stateError) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 font-semibold text-xs tracking-wider text-zinc-500 uppercase shrink-0">
          Explorer
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-red-500">
            <span className="text-sm">Failed to load files</span>
          </div>
        </div>
      </div>
    );
  }

  if (stateLoading || !repoState || tree.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 font-semibold text-xs tracking-wider text-zinc-500 uppercase shrink-0">
          Explorer
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading files...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 font-semibold text-xs tracking-wider text-zinc-500 uppercase shrink-0">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-1">
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
