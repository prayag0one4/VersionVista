import React from 'react'
import { useTimelineStore } from '../store/timelineStore'

const CodeViewer = ()=>{
  const commits = useTimelineStore(s=>s.commits)
  const index = useTimelineStore(s=>s.currentIndex)
  const files = (commits[index] && commits[index].files) || []

  const file = files[0]

  return (
    <div className="p-4 text-sm font-mono whitespace-pre-wrap overflow-auto h-full text-gray-100">
      {file ? file.content : 'No file selected'}
    </div>
  )
}

export default CodeViewer
