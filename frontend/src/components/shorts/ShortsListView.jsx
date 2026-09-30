import React, { useState, useEffect } from 'react';
import { Film, Download, Play, RefreshCw, Loader2, X, Trash2, AlertCircle } from 'lucide-react';
import { fetchRenderJobs } from '../../api/client';

const BASE_URL = 'http://127.0.0.1:8000';

export default function ShortsListView({ onView, sermonData }) {
  const [jobs, setJobs] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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

  const handleDeleteJob = async (jobId) => {
    setDeletingJobId(jobId);
    try {
      const res = await fetch(`${BASE_URL}/api/render/jobs/${jobId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.job_id !== jobId));
      }
    } catch (err) {
      console.error('삭제 실패:', err);
    } finally {
      setDeletingJobId(null);
      setConfirmDeleteId(null);
    }
  };

  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED');
  const activeJobs = jobs.filter((j) => j.status === 'PROCESSING' || j.status === 'QUEUED');
  const failedJobs = jobs.filter((j) => j.status === 'FAILED');

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* 상단 헤더 */}
      <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#DA7756]" />
            <h2 className="text-base font-bold text-[#282622]">생성된 쇼츠 목록</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFECE3] text-[#66635E] font-mono">
              총 {completedJobs.length}개 완료
            </span>
          </div>
          <p className="text-xs text-[#807D77] mt-0.5">
            인코딩이 완료된 9:16 세로 쇼츠를 미리보고 MP4 파일로 다운로드할 수 있습니다.
          </p>
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
            <span>서버에서 1개씩 순차 인코딩 처리 중 ({activeJobs.length}개 작업)</span>
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

                <div className="text-right">
                  {job.status === 'PROCESSING' ? (
                    <span className="text-xs font-bold text-[#DA7756] font-mono">
                      인코딩 {job.progress}%
                    </span>
                  ) : (
                    <span className="text-xs text-[#807D77] font-mono">순차 대기 중</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실패한 작업 */}
      {failedJobs.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span>렌더링 실패 ({failedJobs.length}개)</span>
          </div>
          {failedJobs.map(job => (
            <div key={job.job_id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-red-100 text-xs">
              <div>
                <span className="font-semibold text-[#282622]">{job.title}</span>
                <p className="text-[11px] text-red-600 mt-0.5">{job.error_message || '렌더링 오류'}</p>
              </div>
              <button
                onClick={() => handleDeleteJob(job.job_id)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 완료된 쇼츠 비디오 그리드 */}
      {completedJobs.length === 0 && activeJobs.length === 0 && failedJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#EAE8E1]">
          <Film className="w-8 h-8 text-[#A5A29B] mx-auto mb-2" />
          <p className="text-xs text-[#807D77]">아직 생성된 쇼츠가 없습니다.</p>
          <p className="text-[11px] text-[#A5A29B] mt-1">
            [쇼츠 생성] 메뉴에서 원하는 하이라이트를 골라 렌더링을 요청해보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {completedJobs.map((job) => {
            const videoUrl = job.video_url
              ? job.video_url.startsWith('http')
                ? job.video_url
                : `http://127.0.0.1:8000${job.video_url}`
              : null;

            return (
              <div
                key={job.job_id}
                className="bg-white rounded-2xl border border-[#EAE8E1] overflow-hidden flex flex-col justify-between hover:shadow-xs transition-all"
              >
                {/* 비디오 썸네일 프리뷰 영역 */}
                <div
                  className="relative aspect-[9/16] bg-[#1C1B18] flex items-center justify-center cursor-pointer group"
                  onClick={() => setSelectedVideo({ url: videoUrl, title: job.title })}
                >
                  <video src={videoUrl} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 text-[#282622] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono text-white/90 px-2 py-1 rounded bg-black/60 backdrop-blur-xs">
                    <span>{job.duration}</span>
                    <span>{job.start_time} ~ {job.end_time}</span>
                  </div>
                </div>

                {/* 정보 및 다운로드 버튼 */}
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
                        : job.template === 'full_cinema' || job.template === 'center_crop'
                        ? '풀스크린 시네마'
                        : '블랙 미니멀'}
                    </span>
                  </div>

                  <div>
                    {job.title_question && job.title_answer ? (
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-[#807D77] truncate">
                          {job.title_question}
                        </p>
                        <h3 className="text-xs font-black text-[#DA7756] truncate">
                          {job.title_answer}
                        </h3>
                      </div>
                    ) : (
                      <h3 className="text-xs font-bold text-[#282622] line-clamp-1">
                        {job.title}
                      </h3>
                    )}
                    <p className="text-[11px] text-[#807D77] mt-0.5">
                      {job.church_name || sermonData?.metadata?.title || '설교 쇼츠'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F2EFE8] flex items-center gap-2">
                    <button
                      onClick={() => setSelectedVideo({ url: videoUrl, title: job.title })}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>미리보기</span>
                    </button>
                    <a
                      href={videoUrl}
                      download={`shorts-${job.short_id}.mp4`}
                      className="px-3 py-1.5 rounded-xl border border-[#E0DED7] text-[#282622] hover:bg-[#FAF9F5] text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>MP4</span>
                    </a>
                    {/* 삭제 버튼 */}
                    {confirmDeleteId === job.job_id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteJob(job.job_id)}
                          disabled={deletingJobId === job.job_id}
                          className="px-2 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-semibold transition-colors"
                        >
                          {deletingJobId === job.job_id ? <Loader2 className="w-3 h-3 animate-spin" /> : '삭제'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-xl border border-[#E0DED7] text-[#66635E] text-[11px] font-semibold"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(job.job_id)}
                        className="p-1.5 rounded-xl border border-[#E0DED7] text-[#807D77] hover:text-red-500 hover:border-red-200 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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

            <div className="w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden mb-4 shadow-inner">
              <video src={selectedVideo.url} controls autoPlay className="w-full h-full object-contain" />
            </div>

            <a
              href={selectedVideo.url}
              download="sermon-shorts.mp4"
              className="w-full py-2.5 rounded-xl bg-[#DA7756] hover:bg-[#C56545] text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-md transition-colors"
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
