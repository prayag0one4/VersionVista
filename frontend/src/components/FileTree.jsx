import React from 'react'
import { useTimelineStore } from '../store/timelineStore'

const FileTree = ()=>{
  const commits = useTimelineStore(s=>s.commits)
  const index = useTimelineStore(s=>s.currentIndex)

  const files = (commits[index] && commits[index].files) || []

  return (
    <div className="text-xs">
      {files.map(f=> (
        <div key={f.path} className="px-2 py-1 hover:bg-gray-700 rounded flex justify-between">
          <div className="truncate">{f.path}</div>
        </div>
      ))}
    </div>
  )
}

export default FileTree
