import { useUIStore } from '@/store/uiStore';
import { useTimelineStore } from '@/store/timelineStore';
import { Brain, Activity, Zap, AlertTriangle } from 'lucide-react';

export function AIAnalysisSidebar() {
  const { selectedRepoId } = useUIStore();
  const { currentCommitIndex } = useTimelineStore();

  if (!selectedRepoId) {
    return (
      <div className="flex flex-col h-full bg-[#050505]">
        <div className="px-4 py-2 font-semibold text-xs tracking-wider text-[#8e909a] uppercase shrink-0 border-b border-[#222222]">
          AI Analysis
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Brain className="w-8 h-8 text-[#333333] mb-2" />
          <p className="text-sm text-[#8e909a]">Select a repository to view analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] border-l border-[#222222] w-72 shrink-0">
      <div className="px-4 py-2 font-semibold text-xs tracking-wider text-[#8e909a] uppercase shrink-0 border-b border-[#222222] flex justify-between items-center bg-[#111111]">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-[#adc6ff]" />
          <span>AI Analysis</span>
        </div>
        <span className="bg-[#adc6ff]/10 text-[#adc6ff] text-[10px] px-1.5 py-0.5 rounded font-mono border border-[#adc6ff]/20">ACTIVE</span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Cognitive Load */}
        <div className="bg-[#111111] border border-[#333333] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#c0c1ff]" />
            <h3 className="text-sm font-medium text-[#e3e2e7]">Cognitive Load</h3>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-[#adc6ff] font-mono leading-none">High</span>
            <span className="text-xs text-[#8e909a] mb-0.5">impact</span>
          </div>
          <div className="h-1.5 w-full bg-[#222222] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#adc6ff] to-[#ffb4ab]" style={{ width: '75%' }}></div>
          </div>
          <p className="text-xs text-[#c4c6d0] mt-2">
            Recent changes introduced complex conditional logic. Consider refactoring for clarity.
          </p>
        </div>

        {/* Refactoring Suggestions */}
        <div className="bg-[#111111] border border-[#333333] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#4edea3]" />
            <h3 className="text-sm font-medium text-[#e3e2e7]">Suggestions</h3>
          </div>
          <ul className="space-y-2">
            <li className="text-xs text-[#c4c6d0] flex gap-2">
              <span className="text-[#4edea3] mt-0.5">•</span>
              <span>Extract rendering logic into smaller modular components.</span>
            </li>
            <li className="text-xs text-[#c4c6d0] flex gap-2">
              <span className="text-[#4edea3] mt-0.5">•</span>
              <span>Memoize derived state to prevent unnecessary re-renders.</span>
            </li>
          </ul>
        </div>

        {/* Performance Impact */}
        <div className="bg-[#111111] border border-[#333333] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#ffb4ab]" />
            <h3 className="text-sm font-medium text-[#e3e2e7]">Performance</h3>
          </div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#8e909a]">Bundle Size</span>
            <span className="text-[#ffb4ab] font-mono">+12kb</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8e909a]">Render Time</span>
            <span className="text-[#4edea3] font-mono">-15ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
