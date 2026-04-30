import React, { useEffect } from 'react'
import { useTimelineStore } from './store/timelineStore'
import demoRepo from './data/demoRepo'
import FileTree from './components/FileTree'
import CodeViewer from './components/CodeViewer'
import Timeline from './components/Timeline'

export default function App(){
  const { setCommits, currentIndex } = useTimelineStore()

  useEffect(()=>{
    // load demo data
    setCommits(demoRepo.commits)
  }, [setCommits])

  return (
    <div className="h-screen bg-[#1e1e1e] text-gray-100 font-sans">
      <div className="flex h-full">
        <aside className="w-72 border-r border-gray-700 p-3">
          <div className="text-sm font-semibold mb-3">Explorer</div>
          <FileTree />
        </aside>

        <main className="flex-1 p-4">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto border rounded bg-[#252526]">
              <CodeViewer />
            </div>

            <div className="mt-3">
              <Timeline />
            </div>
          </div>
        </main>

        <aside className="w-80 border-l border-gray-700 p-3">
          <div className="text-sm font-semibold mb-3">Inspector</div>
          <div>Commit index: {currentIndex}</div>
        </aside>
      </div>
    </div>
  )
}
