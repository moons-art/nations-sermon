import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, Download, Play, RefreshCw, X } from 'lucide-react';

export default function RenderQueueStatus({ jobs, onRefresh }) {
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);

  if (!jobs || jobs.length === 0) return null;

  const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
  const processing = jobs.filter((j) => j.status === 'PROCESSING').length;

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1]">
      <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-[#F2EFE8]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#DA7756]"></span>
          <h3 className="text-xs font-bold text-[#282622]">순차 렌더링 큐</h3>
          <span className="text-[11px] font-mono text-[#807D77]">
            ({completed}/{jobs.length} 완료)
          </span>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-[11px] text-[#66635E] hover:text-[#282622] p-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>새로고침</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {jobs.map((job) => {
          const isProc = job.status === 'PROCESSING';
          const isDone = job.status === 'COMPLETED';
          const videoUrl = job.video_url
            ? job.video_url.startsWith('http')
              ? job.video_url
              : `http://127.0.0.1:8000${job.video_url}`
            : null;

          return (
            <div
              key={job.job_id}
              className={`p-3 rounded-xl border text-xs ${
                isProc
                  ? 'border-[#DA7756] bg-[#FAF9F5]'
                  : isDone
                  ? 'border-[#EAE8E1] bg-white'
                  : 'border-[#F2EFE8] bg-[#FAF9F5] text-[#807D77]'
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="font-mono text-[#807D77]">{job.start_time}~{job.end_time}</span>
                {isProc && (
                  <span className="text-[#DA7756] font-semibold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {job.progress}%
                  </span>
                )}
                {isDone && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    완료
                  </span>
                )}
                {job.status === 'QUEUED' && <span>대기</span>}
              </div>

              <div className="font-medium text-[#282622] truncate mb-2">{job.title}</div>

              {isDone && videoUrl && (
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#F2EFE8]">
                  <button
                    onClick={() => setSelectedVideoUrl(videoUrl)}
                    className="flex-1 py-1 rounded-lg bg-[#282622] text-white text-[11px] font-medium flex items-center justify-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    <span>재생</span>
                  </button>
                  <a
                    href={videoUrl}
                    download={`shorts-${job.short_id}.mp4`}
                    className="px-2 py-1 rounded-lg border border-[#E0DED7] text-[#282622] text-[11px] font-medium flex items-center justify-center"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 비디오 재생 모달 */}
      {selectedVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[#1C1B18] rounded-2xl p-4 max-w-xs w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-white/80 text-xs mb-2">
              <span className="font-mono">9:16 Shorts Preview</span>
              <button
                onClick={() => setSelectedVideoUrl(null)}
                className="text-white hover:text-[#DA7756] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full aspect-[9/16] bg-black rounded-xl overflow-hidden mb-3">
              <video src={selectedVideoUrl} controls autoPlay className="w-full h-full object-contain" />
            </div>
            <a
              href={selectedVideoUrl}
              download="shorts.mp4"
              className="w-full py-2 rounded-xl bg-[#DA7756] text-white text-xs font-semibold text-center flex items-center justify-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>MP4 다운로드</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
