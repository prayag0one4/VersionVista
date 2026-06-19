import { useQuery } from '@tanstack/react-query';
import { api, Commit } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useEffect, useRef, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { tokenizeCode, type TokenInfo } from '@/lib/syntaxHighlight';

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'hunk';
  content: string;
  oldLineNum: number | null;
  newLineNum: number | null;
}

export function CodeViewerPanel() {
  const { selectedRepoId, selectedFileId, selectFile } = useUIStore();
  const { currentCommitIndex, showDiff } = useTimelineStore();

  const { data: commits } = useQuery({
    queryKey: ['commits', selectedRepoId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Commit[] }>(`/commits?repoId=${selectedRepoId}&limit=1000`);
      return (res.data.data || []).reverse();
    },
    enabled: !!selectedRepoId,
  });

  const currentCommit = commits?.[currentCommitIndex];
  const prevCommit = commits?.[currentCommitIndex - 1];

  const { data: repoState } = useQuery({
    queryKey: ['repoState', selectedRepoId, currentCommit?.commitHash],
    queryFn: async () => {
      const res = await api.get<{ files: { filePath: string }[] }>(`/code-snapshots/${selectedRepoId}/state/${currentCommit?.commitHash}`);
      return res.data;
    },
    enabled: !!selectedRepoId && !!currentCommit?.commitHash,
  });

  const { data: fileContentData, isLoading: contentLoading, isError: contentError } = useQuery({
    queryKey: ['fileContent', selectedRepoId, currentCommit?.commitHash, selectedFileId],
    queryFn: async () => {
      const res = await api.get<{ filePath: string; content: string }>(`/code-snapshots/${selectedRepoId}/state/${currentCommit?.commitHash}/content?path=${encodeURIComponent(selectedFileId!)}`);
      return res.data.content;
    },
    enabled: !!selectedRepoId && !!currentCommit?.commitHash && !!selectedFileId,
    retry: 2,
    staleTime: 60_000,
  });

  const { data: diffData, isLoading: diffLoading } = useQuery({
    queryKey: ['fileDiff', selectedRepoId, prevCommit?.commitHash, currentCommit?.commitHash, selectedFileId],
    queryFn: async () => {
      const res = await api.get<{ lines: DiffLine[] }>(`/code-snapshots/${selectedRepoId}/diff/${prevCommit?.commitHash}/${currentCommit?.commitHash}/file?path=${encodeURIComponent(selectedFileId!)}`);
      return res.data.lines;
    },
    enabled: !!selectedRepoId && !!prevCommit?.commitHash && !!currentCommit?.commitHash && !!selectedFileId && currentCommitIndex > 0,
    retry: 1,
    staleTime: 60_000,
  });

  // Close tab if selected file was deleted in current commit
  useEffect(() => {
    if (repoState && selectedFileId) {
      const exists = repoState.files.some(f => f.filePath === selectedFileId);
      if (!exists) {
        selectFile(null);
      }
    }
  }, [repoState, selectedFileId, selectFile]);

  // Keep last successful content to avoid blink during commit transitions
  const lastContentRef = useRef<string | null>(null);

  useEffect(() => {
    lastContentRef.current = null;
  }, [selectedFileId]);

  useEffect(() => {
    if (fileContentData !== undefined) {
      lastContentRef.current = fileContentData;
    }
  }, [fileContentData]);

  const fileContent = fileContentData ?? (contentLoading ? lastContentRef.current : null);
  const hasActualChanges = diffData && diffData.some(l => l.type === 'added' || l.type === 'removed') && currentCommitIndex > 0;
  const canShowDiff = showDiff && hasActualChanges;

  const [tokenizedContent, setTokenizedContent] = useState<TokenInfo[][] | null>(null);

  useEffect(() => {
    if (fileContent && !canShowDiff) {
      tokenizeCode(fileContent, selectedFileId!).then(result => {
        setTokenizedContent(result.lines.map(l => l.tokens));
      });
    } else {
      setTokenizedContent(null);
    }
  }, [fileContent, selectedFileId, canShowDiff]);

  const [tokenizedDiff, setTokenizedDiff] = useState<(TokenInfo[] | null)[]>([]);

  useEffect(() => {
    if (diffData && canShowDiff) {
      const fullCode = diffData.map(l => l.content).join('\n');
      tokenizeCode(fullCode, selectedFileId!).then(result => {
        const tokenLines = result.lines.map(l => l.tokens);
        if (tokenLines.length === diffData.length) {
          setTokenizedDiff(tokenLines);
        } else {
          setTokenizedDiff(diffData.map(l => l.content ? [{ content: l.content, color: '#e3e2e7' }] : null));
        }
      });
    } else {
      setTokenizedDiff([]);
    }
  }, [diffData, canShowDiff, selectedFileId]);

  if (!selectedFileId) {
    return (
      <div className="flex h-full items-center justify-center text-[#8e909a] opacity-50 bg-[#050505]">
        <div className="text-center">
          <div className="mb-4 w-32 h-32 mx-auto text-[#333333]">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0L100 25V75L50 100L0 75V25L50 0Z" fill="currentColor" opacity="0.1" />
              <path d="M50 0V50M100 25L50 50M0 25L50 50M50 100V50M100 75L50 50M0 75L50 50" stroke="currentColor" opacity="0.2" />
            </svg>
          </div>
          <p className="font-sans">Select a file to view its contents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* File Tabs */}
      <div className="flex h-10 items-center bg-[#000000] overflow-x-auto no-scrollbar shrink-0">
        <div className="group flex items-center h-full px-4 border-t-2 border-[#adc6ff] bg-[#050505] text-[#e3e2e7] text-[13px] cursor-pointer select-none min-w-max gap-2 font-mono">
          <span>{selectedFileId.split('/').pop()}</span>
          {canShowDiff && (
            <span className="px-1.5 py-0.5 text-[10px] bg-[#4edea3]/10 text-[#4edea3] rounded border border-[#4edea3]/20">DIFF</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); selectFile(null); }}
            className="p-0.5 rounded hover:bg-[#222222] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5 text-[#8e909a]" />
          </button>
        </div>
      </div>

      {/* Path Breadcrumb */}
      <div className="flex h-8 items-center px-4 bg-[#050505] text-[#8e909a] text-xs shrink-0 border-b border-[#222222] font-mono">
        {selectedFileId}
        {canShowDiff && (
          <span className="ml-4 text-[#c0c1ff]">
            {prevCommit?.commitHash?.substring(0, 7)} → {currentCommit?.commitHash?.substring(0, 7)}
          </span>
        )}
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {diffLoading && canShowDiff ? (
          <div className="flex items-center justify-center h-full text-[#8e909a]">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#adc6ff] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-sans">Loading diff...</span>
            </div>
          </div>
        ) : canShowDiff ? (
          <div className="py-4 font-mono text-[13px] leading-6 whitespace-pre">
            {diffData!.map((line, idx) => {
              const tokens = tokenizedDiff[idx];
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 w-full ${
                    line.type === 'removed' ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]' :
                    line.type === 'added' ? 'bg-[#4edea3]/10 text-[#4edea3]' :
                    line.type === 'hunk' ? 'bg-[#c0c1ff]/10 text-[#c0c1ff]' :
                    'bg-transparent'
                  }`}
                  style={{ paddingLeft: '8px' }}
                >
                  <span className="w-10 shrink-0 text-right text-[#333333] select-none pr-2">
                    {line.type === 'removed' ? line.oldLineNum : line.type === 'added' ? line.newLineNum : line.oldLineNum}
                  </span>
                  <span className="w-6 shrink-0 text-center select-none flex items-center justify-center h-6">
                    {line.type === 'removed' ? <Minus className="w-3 h-3 text-[#ffb4ab]" /> : line.type === 'added' ? <Plus className="w-3 h-3 text-[#4edea3]" /> : ' '}
                  </span>
                  <span className="flex-1 select-text">
                    {tokens ? (
                      tokens.length === 0 ? <span>&nbsp;</span> : tokens.map((token, ti) => (
                        <span key={ti} style={{ color: token.color === '#d4d4d4' ? '#e3e2e7' : token.color }}>{token.content}</span>
                      ))
                    ) : (
                      <span style={{ color: '#e3e2e7' }}>{line.content || '\u00A0'}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : contentLoading && fileContent === null ? (
          <div className="flex items-center justify-center h-full text-[#8e909a]">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#adc6ff] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-sans">Loading...</span>
            </div>
          </div>
        ) : contentError && fileContent === null ? (
          <div className="flex items-center justify-center h-full text-[#ffb4ab]">
            <span className="text-sm font-sans">Failed to load file content</span>
          </div>
        ) : fileContent === null ? (
          <div className="flex items-center justify-center h-full text-[#8e909a]">
            <span className="text-sm font-sans">File not found at this revision</span>
          </div>
        ) : (
          <div className="py-4 font-mono text-[13px] leading-6 whitespace-pre">
            {(tokenizedContent || fileContent!.split('\n').map(l => [{ content: l, color: '#e3e2e7' }])).map((line, idx) => (
              <div key={idx} className="flex items-start gap-2 hover:bg-[#111111] transition-colors">
                <span className="w-10 shrink-0 text-right text-[#333333] select-none pr-2">{idx + 1}</span>
                <span className="w-6 shrink-0 text-center text-[#333333] select-none"> </span>
                <span className="flex-1 select-text">
                  {line.length === 0 ? (
                    <span className="text-[#e3e2e7]">&nbsp;</span>
                  ) : (
                    line.map((token, ti) => (
                      <span key={ti} style={{ color: token.color === '#d4d4d4' ? '#e3e2e7' : token.color }}>{token.content}</span>
                    ))
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}