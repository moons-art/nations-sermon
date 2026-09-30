import { useState, useEffect } from 'react';
import { Film, Download, Play, RefreshCw, Loader2, X, Trash2 } from 'lucide-react';
import { fetchRenderJobs, deleteRenderJob, RenderJob } from '../../api/client';
import { SermonAnalysisData } from '../../utils/mockData';

interface ShortsListViewProps {
  onView?: () => void;
  sermonData: SermonAnalysisData;
}

export default function ShortsListView({ onView, sermonData }: ShortsListViewProps) {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string | null; title: string } | null>(null);

  useEffect(() => {
    if (onView) onView();
    loadJobs();
    const interval = setInterval(loadJobs, 2500);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    const res = await fetchRenderJobs();
    if (res && res.jobs) {
      setJobs(res.jobs);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('이 쇼츠 영상을 목록에서 삭제하시겠습니까?')) return;
    setDeletedIds((prev) => [...prev, jobId]);
    setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
    await deleteRenderJob(jobId);
  };

  // If no jobs returned from backend, generate simulated completed jobs from sermonData.shorts
  const baseJobs = jobs.length > 0 ? jobs : sermonData.shorts.slice(0, 3).map((s, idx) => ({
    job_id: `sample-job-${idx + 1}`,
    short_id: s.id,
    title: s.title,
    start_time: s.startTime,
    end_time: s.endTime,
    duration: s.duration,
    status: 'COMPLETED' as const,
    progress: 100,
    template: idx === 0 ? 'dark_minimal' : idx === 1 ? 'yellow_frame' : 'vivid_blue',
    bgm: 'grace.mp3',
    platform: idx === 1 ? 'instagram' : 'youtube',
    church_name: sermonData.metadata.churchName,
    video_url: null,
  }));

  const effectiveJobs = baseJobs.filter((j) => !deletedIds.includes(j.job_id));

  const completedJobs = effectiveJobs.filter((j) => j.status === 'COMPLETED');
  const activeJobs = effectiveJobs.filter((j) => j.status === 'PROCESSING' || j.status === 'QUEUED');

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn">
      {/* 상단 헤더 */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-[#DA7756]" />
          <h2 className="text-sm font-bold text-[#282622]">생성된 쇼츠 목록</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFECE3] text-[#66635E] font-mono">
            총 {completedJobs.length}개
          </span>
        </div>

        <button
          onClick={loadJobs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0DED7] text-xs font-medium text-[#66635E] hover:bg-[#FAF9F5] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>목록 갱신</span>
        </button>
      </div>

      {/* 현재 인코딩 진행 중인 작업 알림 카드 */}
      {activeJobs.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#DA7756]/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#DA7756]">
            <Loader2 className="w-4 h-4 animate-spin text-[#DA7756]" />
            <span>순차 인코딩 처리 중 ({activeJobs.length}개)</span>
          </div>

          <div className="space-y-2">
            {activeJobs.map((job) => (
              <div
                key={job.job_id}
                className="p-3 bg-white rounded-xl border border-[#EAE8E1] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-[#282622]">{job.title}</div>
                  <div className="text-[11px] font-mono text-[#807D77]">
                    구간: {job.start_time} ~ {job.end_time} &bull; 템플릿: {job.template} &bull; BGM: {job.bgm}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {job.status === 'PROCESSING' ? (
                    <span className="text-xs font-bold text-[#DA7756] font-mono">
                      인코딩 {job.progress}%
                    </span>
                  ) : (
                    <span className="text-xs text-[#807D77] font-mono">대기 중</span>
                  )}
                  <button
                    onClick={() => handleDeleteJob(job.job_id)}
                    className="p-1 rounded-lg text-[#A5A29B] hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 완료된 쇼츠 비디오 그리드 */}
      {completedJobs.length === 0 && activeJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#EAE8E1]">
          <Film className="w-8 h-8 text-[#A5A29B] mx-auto mb-2" />
          <p className="text-xs text-[#807D77]">생성된 쇼츠가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {completedJobs.map((job) => {
            const videoUrl = job.video_url || null;
            const shortMatch = sermonData.shorts.find((s) => s.id === job.short_id) || sermonData.shorts[0];

            return (
              <div
                key={job.job_id}
                className="bg-white rounded-2xl border border-[#EAE8E1] overflow-hidden flex flex-col justify-between hover:shadow-xs transition-all"
              >
                {/* 비디오 썸네일 프리뷰 영역 */}
                <div
                  className="relative aspect-[9/14] bg-[#1C1B18] flex items-center justify-center cursor-pointer group"
                  onClick={() => setSelectedVideo({ url: videoUrl, title: job.title })}
                >
                  <img
                    src={sermonData.metadata.thumbnail}
                    alt="쇼츠 썸네일"
                    className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 text-[#282622] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono text-white/90 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs">
                    <span>{job.duration}</span>
                    <span>{job.start_time} ~ {job.end_time}</span>
                  </div>
                </div>

                {/* 정보 및 다운로드/삭제 버튼 */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E0DED7] text-[#66635E]">
                      {job.platform === 'instagram' ? '인스타용' : '유튜브용'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EFECE3] text-[#282622]">
                      {job.template === 'yellow_frame'
                        ? '옐로우 프레임'
                        : job.template === 'vivid_blue'
                        ? '비비드 블루'
                        : job.template === 'modern_grey'
                        ? '모던 그레이'
                        : job.template === 'full_cinema'
                        ? '풀스크린 시네마'
                        : '블랙 미니멀'}
                    </span>
                  </div>

                  <div>
                    {shortMatch?.title_question && shortMatch?.title_answer ? (
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-[#807D77] truncate">
                          {shortMatch.title_question}
                        </p>
                        <h3 className="text-xs font-black text-[#DA7756] truncate">
                          {shortMatch.title_answer}
                        </h3>
                      </div>
                    ) : (
                      <h3 className="text-xs font-bold text-[#282622] line-clamp-1">
                        {job.title}
                      </h3>
                    )}
                    <p className="text-[11px] text-[#807D77] mt-0.5">
                      {job.church_name || sermonData?.metadata?.churchName || '설교 쇼츠'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F2EFE8] flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedVideo({ url: videoUrl, title: job.title })}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>미리보기</span>
                    </button>
                    <button
                      onClick={() => {
                        if (videoUrl) {
                          const a = document.createElement('a');
                          a.href = videoUrl;
                          a.download = `${job.title}.mp4`;
                          a.click();
                        } else {
                          alert(`"${job.title}" 쇼츠 다운로드를 시작합니다.`);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-[#E0DED7] text-[#282622] hover:bg-[#FAF9F5] text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>저장</span>
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.job_id)}
                      className="px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="쇼츠 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 비디오 재생 팝업 모달 */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[#1C1B18] rounded-3xl p-5 max-w-sm w-full flex flex-col items-center border border-white/10 shadow-2xl">
            <div className="w-full flex items-center justify-between text-white text-xs mb-3 px-1">
              <span className="font-semibold truncate max-w-[200px]">{selectedVideo.title}</span>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden mb-4 shadow-inner relative flex items-center justify-center">
              {selectedVideo.url ? (
                <video src={selectedVideo.url} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-6 text-white space-y-2">
                  <Film className="w-12 h-12 text-[#DA7756] mx-auto animate-pulse" />
                  <p className="text-xs font-bold">{selectedVideo.title}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (selectedVideo.url) {
                  const a = document.createElement('a');
                  a.href = selectedVideo.url;
                  a.download = `${selectedVideo.title}.mp4`;
                  a.click();
                } else {
                  alert(`"${selectedVideo.title}" 영상 다운로드를 시작합니다.`);
                }
                setSelectedVideo(null);
              }}
              className="w-full py-2.5 rounded-xl bg-[#DA7756] hover:bg-[#C56545] text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>MP4 다운로드</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
