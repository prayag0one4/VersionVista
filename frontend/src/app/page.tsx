'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Repository, Commit } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useTimelineStore } from '@/store/timelineStore';
import { FileTreePanel } from '@/components/layout/FileTreePanel';
import { CodeViewerPanel } from '@/components/layout/CodeViewerPanel';
import { TimelinePanel } from '@/components/layout/TimelinePanel';
import { ChevronDown } from 'lucide-react';

import { AddRepoDialog } from '@/components/layout/AddRepoDialog';

export default function Home() {
  const { selectedRepoId, selectRepo } = useUIStore();
  const { currentCommitIndex, setCurrentCommitIndex } = useTimelineStore();

  const { data: repos, isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const res = await api.get<{success: boolean, data: Repository[]}>('/repo');
      return res.data.data;
    },
  });

  const { data: commits } = useQuery({
    queryKey: ['commits', selectedRepoId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Commit[] }>(`/commits?repoId=${selectedRepoId}&limit=1000`);
      return (res.data.data || []).reverse();
    },
    enabled: !!selectedRepoId,
  });

  const currentCommit = commits?.[currentCommitIndex];

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading repositories...</div>;
  }

  if (!selectedRepoId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-zinc-950 p-6 text-zinc-100">
        <h1 className="text-3xl font-bold">VersionVista</h1>
        <p className="text-zinc-400">Select a repository to visualize its timeline</p>
        
        <div className="flex w-full max-w-4xl justify-end mb-2">
          <AddRepoDialog />
        </div>

        {(!repos || repos.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-zinc-800 rounded-lg w-full max-w-4xl bg-zinc-900/30">
            <p className="text-zinc-500 mb-4">No repositories found. Add your first one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl content-start">
            {repos.map(repo => (
              <button
                key={repo._id}
                onClick={() => selectRepo(repo._id)}
                className="flex flex-col items-start rounded-lg border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 text-left"
              >
                <h2 className="text-lg font-semibold">{repo.name}</h2>
                <p className="mt-2 text-sm text-zinc-400 truncate w-full" title={repo.localPath}>{repo.localPath}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="rounded bg-zinc-800 px-2 py-1">{repo.defaultBranch}</span>
                  <span className="rounded bg-zinc-800 px-2 py-1 capitalize">{repo.status}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Header */}
      <header className="flex h-12 items-center border-b border-zinc-800 px-4 shrink-0 bg-zinc-950 justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold cursor-pointer" onClick={() => selectRepo(null)}>VersionVista</h1>
          <span className="text-zinc-600">/</span>
          <span className="text-sm text-zinc-400">{repos?.find(r => r._id === selectedRepoId)?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {commits && commits.length > 0 && (
            <div className="relative">
              <select
                value={currentCommit?.commitHash || ''}
                onChange={(e) => {
                  const hash = e.target.value;
                  const idx = commits?.findIndex(c => c.commitHash === hash);
                  if (idx !== undefined && idx !== -1) {
                    setCurrentCommitIndex(idx);
                  }
                }}
                className="bg-zinc-800 border border-zinc-700 text-xs rounded px-2 py-1 text-zinc-100 appearance-none pr-8 cursor-pointer hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[280px]"
                title="Select commit"
              >
                {commits?.map((commit, idx) => (
                  <option key={commit.commitHash} value={commit.commitHash}>
                    {idx + 1}: {commit.commitHash.substring(0, 8)} - {commit.message.substring(0, 60)}{commit.message.length > 60 ? '...' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: File Tree */}
        <div className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">
          <FileTreePanel />
        </div>

        {/* Center Panel: Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          <CodeViewerPanel />
        </div>
      </div>

      {/* Bottom Panel: Timeline */}
      <div className="h-48 shrink-0 border-t border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">
        <TimelinePanel />
      </div>
    </div>
  );
}
