'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Repository, Commit } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useTimelineStore } from '@/store/timelineStore';
import { FileTreePanel } from '@/components/layout/FileTreePanel';
import { CodeViewerPanel } from '@/components/layout/CodeViewerPanel';
import { TimelinePanel } from '@/components/layout/TimelinePanel';
import { ChevronDown, GitBranch, Play } from 'lucide-react';

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
    return <div className="flex h-screen items-center justify-center bg-[#000000] text-[#e3e2e7]">Loading repositories...</div>;
  }

  if (!selectedRepoId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#000000] p-6 text-[#e3e2e7]">
        <h1 className="text-3xl font-bold font-sans">VersionVista</h1>
        <p className="text-[#8e909a]">Select a repository to visualize its timeline</p>
        
        <div className="flex w-full max-w-4xl justify-end mb-2">
          <AddRepoDialog />
        </div>

        {(!repos || repos.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-[#333333] rounded-lg w-full max-w-4xl bg-[#050505]">
            <p className="text-[#8e909a] mb-4">No repositories found. Add your first one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl content-start">
            {repos.map(repo => (
              <button
                key={repo._id}
                onClick={() => selectRepo(repo._id)}
                className="flex flex-col items-start rounded-xl border border-[#333333] bg-[#111111]/60 backdrop-blur-md p-6 transition-all hover:border-[#adc6ff]/50 hover:bg-[#1a1a1a] text-left shadow-lg"
              >
                <h2 className="text-lg font-semibold text-[#e3e2e7]">{repo.name}</h2>
                <p className="mt-2 text-sm text-[#8e909a] truncate w-full font-mono" title={repo.localPath}>{repo.localPath}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[#c0c1ff]">
                  <span className="rounded bg-[#333333]/40 border border-[#333333] px-2 py-1">{repo.defaultBranch}</span>
                  <span className="rounded bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] px-2 py-1 capitalize">{repo.status}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#000000] text-[#e3e2e7] overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex h-14 items-center border-b border-[#222222] px-4 shrink-0 bg-[#000000]/80 backdrop-blur-md justify-between z-20">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold cursor-pointer text-[#e3e2e7] hover:text-[#adc6ff] transition-colors" onClick={() => selectRepo(null)}>VersionVista</h1>
          <span className="text-[#333333]">/</span>
          <span className="text-sm text-[#c4c6d0]">{repos?.find(r => r._id === selectedRepoId)?.name}</span>
        </div>
        <div className="flex items-center gap-4">

          {/* Commit Selection */}
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
                className="bg-[#111111] border border-[#333333] font-mono text-[13px] rounded-lg pl-3 pr-8 py-1.5 text-[#e3e2e7] appearance-none cursor-pointer hover:border-[#adc6ff] focus:outline-none focus:ring-1 focus:ring-[#adc6ff] min-w-[320px] transition-colors shadow-sm"
                title="Select commit"
              >
                {commits?.map((commit, idx) => (
                  <option key={commit.commitHash} value={commit.commitHash}>
                    {commit.commitHash.substring(0, 7)} - {commit.message.substring(0, 50)}{commit.message.length > 50 ? '...' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8e909a] pointer-events-none" />
            </div>
          )}

        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Left Panel: File Tree */}
        <div className="w-64 shrink-0 border-r border-[#222222] bg-[#000000]/90 backdrop-blur-sm flex flex-col overflow-hidden">
          <FileTreePanel />
        </div>

        {/* Center Panel: Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
          <CodeViewerPanel />
        </div>

      </div>

      {/* Bottom Panel: Timeline spans full width */}
      <div className="h-48 shrink-0 border-t border-[#222222] bg-[#000000]/90 backdrop-blur-md flex flex-col overflow-hidden relative z-20">
        <TimelinePanel />
      </div>
    </div>
  );
}
