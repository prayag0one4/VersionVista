import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Commit, RepositoryState } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useTimelineStore } from '@/store/timelineStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, FastForward } from 'lucide-react';
import { useEffect } from 'react';

export function TimelinePanel() {
  const { selectedRepoId } = useUIStore();
  const { 
    currentCommitIndex, setCurrentCommitIndex, 
    isPlaying, play, pause, 
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
      const commitHash = commits[idx].commitHash;
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

  if (!commits) {
    return <div className="p-4 text-center text-sm text-zinc-400">Select a repository to view timeline</div>;
  }

  const currentCommit = commits[currentCommitIndex];

  return (
    <div className="flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevCommit} disabled={currentCommitIndex === 0}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={isPlaying ? pause : play}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => nextCommit(commits.length)} disabled={currentCommitIndex >= maxIndex}>
            <SkipForward className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2 ml-4">
            <FastForward className="w-4 h-4 text-zinc-500" />
            <select 
              className="bg-zinc-900 border border-zinc-800 text-xs rounded px-1 py-0.5 text-zinc-300"
              value={playbackSpeed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
            </select>
          </div>
        </div>

          <div className="flex items-center gap-2">
          <div className="text-xs text-zinc-400 font-mono">
            Commit {currentCommitIndex + 1} of {commits.length}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Diff</span>
            <button
              onClick={toggleDiff}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
                showDiff ? 'bg-green-500' : 'bg-zinc-700'
              }`}
              title={showDiff ? 'Disable diff view (show full files)' : 'Enable diff view (show changes vs previous commit)'}
              aria-label={showDiff ? 'Disable diff view' : 'Enable diff view'}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  showDiff ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-zinc-500">
              {showDiff ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Visualizer */}
      <div className="flex-1 p-4 flex flex-col gap-4 relative">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
          <span>Oldest</span>
          <span>Newest</span>
        </div>
        
        <Slider 
          value={[currentCommitIndex]} 
          max={maxIndex} 
          step={1}
          onValueChange={(vals) => setCurrentCommitIndex(Array.isArray(vals) || typeof vals === 'object' ? (vals as readonly number[])[0] : (vals as number))}
          className="my-2"
        />

        {/* Commit Details Card */}
        {currentCommit && (
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded mt-auto flex flex-col gap-1 shadow-md shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-blue-400">{currentCommit.commitHash?.substring(0, 7)}</span>
              <span className="text-xs text-zinc-500">{new Date(currentCommit.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm font-medium text-zinc-200 truncate" title={currentCommit.message}>
              {currentCommit.message}
            </p>
            <div className="text-xs text-zinc-400 mt-1">
              By {currentCommit.author?.name || 'Unknown'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
