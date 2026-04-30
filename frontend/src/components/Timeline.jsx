import React, {useEffect, useRef} from 'react'
import { useTimelineStore } from '../store/timelineStore'

const Timeline = ()=>{
  const commits = useTimelineStore(s=>s.commits)
  const index = useTimelineStore(s=>s.currentIndex)
  const setIndex = useTimelineStore(s=>s.setCurrentIndex)
  const isPlaying = useTimelineStore(s=>s.isPlaying)
  const setPlaying = useTimelineStore(s=>s.setPlaying)
  const speed = useTimelineStore(s=>s.speed)
  const playRef = useRef(null)

  useEffect(()=>{
    if(!isPlaying) return
    playRef.current = setInterval(()=>{
      setIndex(i=>Math.min(i+1, commits.length-1))
    }, 1000 / speed)

    return ()=> clearInterval(playRef.current)
  }, [isPlaying, speed, commits.length, setIndex])

  return (
    <div className="bg-[#1f1f1f] p-2 rounded">
      <div className="flex items-center gap-2">
        <button onClick={()=>setPlaying(!isPlaying)} className="px-3 py-1 bg-gray-800 rounded">{isPlaying? 'Pause':'Play'}</button>
        <div>Index: {index}</div>
        <div className="flex-1">
          <input type="range" min={0} max={Math.max(0, commits.length-1)} value={index} onChange={(e)=>setIndex(Number(e.target.value))} className="w-full" />
        </div>
      </div>
    </div>
  )
}

export default Timeline
