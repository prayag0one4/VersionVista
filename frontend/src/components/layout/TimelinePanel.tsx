import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Commit, RepositoryState, FileChange } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useTimelineStore } from '@/store/timelineStore';

import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, FileCode2, PlusCircle, MinusCircle, ChevronDown } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export function TimelinePanel() {
  const { selectedRepoId } = useUIStore();
  const selectFile = useUIStore((s) => s.selectFile);
  const { 
    currentCommitIndex, setCurrentCommitIndex, 
    isPlaying, play, pause, replay,
    playbackSpeed, setSpeed,
    nextCommit, prevCommit,
    showDiff, toggleDiff
  } = useTimelineStore();
  const queryClient = useQueryClient();

  const { data: commits } = useQuery({
    queryKey: ['commits', selectedRepoId],
    queryFn: async () => {
      const res = await api.get<{success: boolean, data: Commit[]}>(`/commits?repoId=${selectedRepoId}&limit=1000`);
      return (res.data.data || []).reverse();
    },
    enabled: !!selectedRepoId,
  });

  const maxIndex = commits ? commits.length - 1 : 0;

  // Pre-fetch upcoming commits' repo states aggressively
  useEffect(() => {
    if (!commits || commits.length === 0) return;

    const indices = new Set<number>();

    // When playing, prefetch ALL remaining commits
    // When idle, prefetch a window ahead + 2 behind
    if (isPlaying) {
      for (let i = currentCommitIndex + 1; i < commits.length; i++) {
        indices.add(i);
      }
    } else {
      const ahead = 10;
      const behind = 2;
      for (let i = 1; i <= ahead; i++) {
        if (currentCommitIndex + i < commits.length) indices.add(currentCommitIndex + i);
      }
      for (let i = 1; i <= behind; i++) {
        if (currentCommitIndex - i >= 0) indices.add(currentCommitIndex - i);
      }
    }

    for (const idx of indices) {
      const commit = commits[idx];
      if (!commit) continue;
      const commitHash = commit.commitHash;
      queryClient.prefetchQuery({
        queryKey: ['repoState', selectedRepoId, commitHash],
        queryFn: async () => {
          const res = await api.get<RepositoryState>(`/code-snapshots/${selectedRepoId}/state/${commitHash}`);
          return res.data;
        },
        staleTime: 60_000,
      });
    }
  }, [currentCommitIndex, isPlaying, commits, selectedRepoId, queryClient]);
  
  // Playback logic
  useEffect(() => {
    if (!isPlaying || !commits || currentCommitIndex >= maxIndex) {
      if (isPlaying && currentCommitIndex >= maxIndex) pause();
      return;
    }

    const interval = setInterval(() => {
      nextCommit(commits.length);
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentCommitIndex, maxIndex, playbackSpeed, commits, nextCommit, pause]);

  const currentCommit = commits?.[currentCommitIndex];
  const isFinished = !isPlaying && currentCommitIndex >= maxIndex && commits && commits.length > 0;

  const [filesOpen, setFilesOpen] = useState(false);
  const filesRef = useRef<HTMLDivElement>(null);

  const { data: fileChanges } = useQuery({
    queryKey: ['fileChanges', currentCommit?._id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: FileChange[] }>(
        `/file-changes?commitId=${currentCommit?._id}`
      );
      return res.data.data;
    },
    enabled: !!currentCommit?._id && filesOpen,
  });

  useEffect(() => {
    if (!filesOpen) return;
    const handler = (e: MouseEvent) => {
      if (filesRef.current && !filesRef.current.contains(e.target as Node)) {
        setFilesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filesOpen]);

  if (!commits) {
    return <div className="p-4 text-center text-sm text-[#8e909a]">Select a repository to view timeline</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#222222] shrink-0 bg-[#111111]/50">
        <div className="flex items-center gap-2">
          <div className="relative" ref={filesRef}>
            <button
              onClick={() => setFilesOpen(!filesOpen)}
              className="flex items-center gap-4 text-xs font-mono text-[#c4c6d0] hover:text-[#e3e2e7] transition-colors rounded-md px-2 py-1 -mx-2 hover:bg-[#222222]/50"
            >
              <div className="flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-[#c0c1ff]" />
                <span>{currentCommit?.filesChanged ?? 0} files</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-[#4edea3]" />
                <span className="text-[#4edea3]">+{currentCommit?.insertions ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MinusCircle className="w-3.5 h-3.5 text-[#ffb4ab]" />
                <span className="text-[#ffb4ab]">-{currentCommit?.deletions ?? 0}</span>
              </div>
              <ChevronDown className={`w-3 h-3 text-[#8e909a] transition-transform ${filesOpen ? 'rotate-180' : ''}`} />
            </button>

            {filesOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto rounded-lg border border-[#333333] bg-[#111111] shadow-xl z-50">
                <div className="p-2 border-b border-[#222222] text-[10px] font-mono uppercase tracking-wider text-[#8e909a] px-3 py-2">
                  Changed Files
                </div>
                {!fileChanges ? (
                  <div className="px-3 py-4 text-xs text-[#8e909a] text-center">Loading...</div>
                ) : fileChanges.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-[#8e909a] text-center">No file changes found</div>
                ) : (
                  fileChanges.map((fc) => (
                    <button
                      key={fc._id}
                      onClick={() => {
                        selectFile(fc.filePath);
                        setFilesOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a1a1a] transition-colors border-b border-[#222222]/50 last:border-0 w-full text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          fc.changeType === 'added' ? 'bg-[#4edea3]' :
                          fc.changeType === 'deleted' ? 'bg-[#ffb4ab]' :
                          'bg-[#adc6ff]'
                        }`} />
                        <span className="truncate font-mono text-[11px] text-[#e3e2e7]" title={fc.filePath}>
                          {fc.filePath}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {fc.additions > 0 && (
                          <span className="text-[#4edea3] font-mono text-[11px]">+{fc.additions}</span>
                        )}
                        {fc.deletions > 0 && (
                          <span className="text-[#ffb4ab] font-mono text-[11px]">-{fc.deletions}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#8e909a]">Speed:</span>
            <select 
              className="bg-[#111111] border border-[#333333] rounded px-1.5 py-0.5 text-[#e3e2e7] focus:outline-none focus:border-[#adc6ff]"
              value={playbackSpeed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
            </select>
          </div>
          <div className="text-xs text-[#8e909a] font-mono border-l border-[#222222] pl-4">
            Commit {currentCommitIndex + 1} of {commits.length}
          </div>
          <div className="flex items-center gap-2 border-l border-[#222222] pl-4">
            <span className="text-xs text-[#c4c6d0]">Diff</span>
            <button
              onClick={toggleDiff}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-[#adc6ff] ${
                showDiff ? 'bg-[#6ffbbe]' : 'bg-[#333333]'
              }`}
              title={showDiff ? 'Disable diff view' : 'Enable diff view'}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  showDiff ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-mono text-[#8e909a] w-6">
              {showDiff ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Visualizer */}
      <div className="flex-1 p-4 flex flex-col gap-2 relative w-full overflow-hidden">
        
        {/* Playback & Slider Full Width */}
        <div className="flex items-center gap-6 mt-2 w-full px-4">
          {/* Play/Pause Controls */}
          <div className="flex items-center gap-1">
            <button 
              className="p-1.5 rounded-full text-[#8e909a] hover:bg-[#222222] hover:text-[#e3e2e7] transition-colors disabled:opacity-50"
              onClick={prevCommit} disabled={currentCommitIndex === 0}
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button 
              className="p-2 rounded-full bg-[#d8e2ff]/10 text-[#adc6ff] hover:bg-[#d8e2ff]/20 transition-colors shadow-[0_0_10px_rgba(173,198,255,0.2)]"
              onClick={isFinished ? replay : isPlaying ? pause : play}
              title={isFinished ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
            >
              {isFinished ? <RotateCcw className="w-5 h-5" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button 
              className="p-1.5 rounded-full text-[#8e909a] hover:bg-[#222222] hover:text-[#e3e2e7] transition-colors disabled:opacity-50"
              onClick={() => nextCommit(commits.length)} disabled={currentCommitIndex >= maxIndex}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Slider */}
          <div className="flex-1">
            <Slider 
              value={[currentCommitIndex]} 
              max={maxIndex} 
              step={1}
              onValueChange={(vals) => setCurrentCommitIndex(Array.isArray(vals) || typeof vals === 'object' ? (vals as readonly number[])[0] : (vals as number))}
              className="my-2"
            />
          </div>
        </div>

        {/* Commit Details Card */}
        {currentCommit && (
          <div className="bg-[#111111] border border-[#333333] p-5 rounded-xl mt-auto mb-2 flex flex-col gap-1 shadow-[0_-4px_12px_rgba(0,0,0,0.2)] shrink-0 mx-4 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ffffff]/10 to-transparent"></div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-[#adc6ff] bg-[#adc6ff]/10 px-2 py-0.5 rounded border border-[#adc6ff]/20">{currentCommit.commitHash?.substring(0, 7)}</span>
              <span className="text-xs text-[#8e909a] font-mono">{new Date(currentCommit.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm font-medium text-[#e3e2e7] truncate py-1" title={currentCommit.message}>
              {currentCommit.message}
            </p>
            <div className="text-xs text-[#c4c6d0] mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c0c1ff]"></span>
              {currentCommit.author?.name || 'Unknown'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
