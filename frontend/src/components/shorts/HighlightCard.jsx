import React, { useState } from 'react';
import {
  Clock,
  Edit3,
  CheckSquare,
  Square,
  Play,
  Pause,
  Loader2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

// 타임스탬프 문자열("04:12" 또는 "01:23:45")을 초(seconds)로 변환
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.toString().trim().split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  const parsed = parseInt(timeStr, 10);
  return isNaN(parsed) ? 0 : parsed;
}

// 유튜브 URL에서 videoId 추출
function extractYoutubeId(url) {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export default function HighlightCard({
  short,
  index,
  isSelected,
  onToggleSelect,
  onOpenSubtitleModal,
  onSingleRender,
  isRendering,
  youtubeUrl,
  template = 'dark_minimal',
  churchName = '예배공동체',
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  // 상단 1줄 제목 (궁금증) / 2줄 소제목 (대답)
  const questionTitle = short.title_question || short.hook || short.title || '죽고싶다는 당신에게';
  const answerTitle = short.title_answer || short.title || '하나님의 대답';
  const firstSubtitle = short.sentences?.[0]?.text || short.summary || '말씀 속에서 주시는 은혜의 메시지';

  const effectiveYoutubeUrl = short.youtube_url || youtubeUrl;
  const videoId = extractYoutubeId(effectiveYoutubeUrl);

  const startSeconds = parseTimeToSeconds(short.startTime);
  const endSeconds = parseTimeToSeconds(short.endTime) || startSeconds + 50;

  // 템플릿별 시각 디자인 프리셋 (모든 템플릿: 검은 배경 박스 제거, 글자 외곽선)
  const templateStyles = {
    cinema_letterbox: {
      cardBg: 'bg-[#0B0C0E]',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/20 text-white',
      isLetterbox: true,
    },
    blue_wide: {
      cardBg: 'bg-[#1E62D0]',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/20 text-white',
      isLetterbox: true,
    },
    yellow_wide: {
      cardBg: 'bg-[#F4CF42]',
      qColor: 'text-[#121212]',
      aColor: 'text-[#181A22]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-black/10 text-black',
      isLetterbox: true,
    },
    transparent_minimal: {
      cardBg: 'bg-[#1C1D22]',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/10 text-white/90',
    },
    dark_minimal: {
      cardBg: 'bg-[#0E0E10]',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/10 text-white/90',
    },
    yellow_minimal: {
      cardBg: 'bg-[#F4CF42]',
      qColor: 'text-[#121212]',
      aColor: 'text-[#181A22]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-black/10 text-black',
    },
    full_cinema: {
      cardBg: 'bg-slate-950',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/20 text-white',
    },
    // 기존 호환
    vivid_blue: {
      cardBg: 'bg-[#1E62D0]',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/20 text-white',
      isLetterbox: true,
    },
    yellow_frame: {
      cardBg: 'bg-[#F4CF42]',
      qColor: 'text-[#121212]',
      aColor: 'text-[#181A22]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-black/10 text-black',
      isLetterbox: true,
    },
    modern_grey: {
      cardBg: 'bg-[#0E0E10]',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/10 text-white/90',
    },
  };

  const currentTpl = templateStyles[template] || templateStyles.dark_minimal;

  // 유튜브 썸네일 고화질 URL
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&auto=format&fit=crop&q=80';

  return (
    <div
      className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs ${
        isSelected
          ? 'border-[#DA7756] ring-2 ring-[#DA7756]/20'
          : 'border-[#EAE8E1] hover:border-[#DCD9CF]'
      }`}
    >
      <div>
        {/* 상단 번호 & 타임스탬프 & 선택 체크박스 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#282622] text-white font-mono text-xs font-bold flex items-center justify-center">
              #{index + 1}
            </span>
            <span className="text-xs font-mono text-[#807D77] flex items-center gap-1.5 bg-[#FAF9F5] px-2.5 py-1 rounded-lg border border-[#EAE8E1]">
              <Clock className="w-3.5 h-3.5 text-[#A5A29B]" />
              {short.startTime} ~ {short.endTime} ({short.duration})
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggleSelect(short.id)}
            className="text-[#807D77] hover:text-[#DA7756] p-1"
            title="쇼츠 선택"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-[#DA7756]" />
            ) : (
              <Square className="w-5 h-5 text-[#DCD9CF]" />
            )}
          </button>
        </div>

        {/* 9:16 비율 실시간 비디오 / 템플릿 프리뷰 플레이어 */}
        <div className="relative w-full aspect-[9/14] rounded-2xl overflow-hidden border border-[#EAE8E1] shadow-inner mb-3.5 bg-black select-none">
          {short.video_url ? (
            // 백엔드에서 렌더링 완료된 실제 MP4 비디오가 있을 때
            <video
              src={short.video_url}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          ) : isPlaying && videoId ? (
            // 사용자가 카드 내에서 해당 구간을 바로 재생할 때 (실제 설교 영상 임베드)
            <div className="relative w-full h-full bg-black">
              <iframe
                title={`short-player-${index}`}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?start=${startSeconds}&end=${endSeconds}&autoplay=1&controls=1&rel=0&playsinline=1`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                type="button"
                onClick={() => setIsPlaying(false)}
                className="absolute top-2 right-2 z-20 px-2 py-1 rounded-lg bg-black/80 text-white text-[10px] font-bold hover:bg-black flex items-center gap-1 border border-white/20"
              >
                <RotateCcw className="w-3 h-3" />
                <span>템플릿 보기</span>
              </button>
            </div>
          ) : (
            // 대기 상태: 템플릿 디자인 오버레이 + 실제 유튜브 비디오 프리뷰
            <div className={`relative w-full h-full flex flex-col justify-between p-3.5 ${currentTpl.cardBg}`}>
              {/* 비디오 배경 썸네일 */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={thumbnailUrl}
                  alt="설교 영상 썸네일"
                  className="w-full h-full object-cover opacity-60 filter blur-[0.5px] scale-105 transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />
              </div>

              {/* 상단: 템플릿 헤더 (질문 & 답변 - 위치 아래로 내림) */}
              <div className="relative z-10 space-y-1 text-center pt-4 pb-1">
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white/90">
                  {short.duration} 핵심
                </div>
                <h4 className={`text-xs font-bold leading-tight line-clamp-1 drop-shadow-md ${currentTpl.qColor}`}>
                  {questionTitle}
                </h4>
                <p className={`text-sm font-extrabold leading-tight line-clamp-1 drop-shadow-md ${currentTpl.aColor}`}>
                  {answerTitle}
                </p>
              </div>

              {/* 중앙: 재생 버튼 (누르면 해당 구간 실제 영상 즉시 재생) */}
              <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  className="group/btn w-12 h-12 rounded-full bg-[#DA7756] hover:bg-[#C56545] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                  title="이 구간 영상 미리보기 재생"
                >
                  <Play className="w-5 h-5 fill-white ml-0.5 group-hover/btn:scale-105 transition-transform" />
                </button>
                <span className="text-[10px] text-white/90 font-medium mt-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10">
                  구간 영상 재생 ({short.startTime}~{short.endTime})
                </span>
              </div>

              {/* 하단: 첫 번째 자막 및 교회 로고 (자막 위치를 더 위로 올림) */}
              <div className="relative z-10 space-y-2 text-center pb-2">
                <div className={`p-2.5 rounded-xl border backdrop-blur-md text-[11px] font-medium leading-snug line-clamp-2 shadow-sm ${currentTpl.subBg}`}>
                  "{firstSubtitle}"
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-white/80 font-medium opacity-80">
                  <span>{churchName.replace('\n', ' ')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 텍스트 정보 */}
        <div className="space-y-1 pt-1">
          <div className="text-[11px] font-bold text-[#807D77] uppercase tracking-wider flex items-center justify-between">
            <span>추출된 하이라이트</span>
            {videoId && (
              <a
                href={`https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#DA7756] hover:underline flex items-center gap-0.5 font-normal"
              >
                <span>유튜브에서 보기</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          <h3 className="text-sm font-bold text-[#282622] leading-snug line-clamp-1">
            {short.title}
          </h3>
          <p className="text-xs text-[#66635E] line-clamp-2 leading-relaxed">
            {short.summary}
          </p>
        </div>
      </div>

      {/* 하단 액션 버튼: [수정] & [영상 생성] */}
      <div className="pt-3 mt-3 border-t border-[#F2EFE8] flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenSubtitleModal(short)}
          className="flex-1 py-2 px-2.5 rounded-xl border border-[#E0DED7] text-xs font-semibold text-[#44413C] hover:bg-[#FAF9F5] hover:text-[#282622] transition-colors flex items-center justify-center gap-1.5"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#DA7756]" />
          <span>제목·소제목 수정</span>
        </button>

        <button
          type="button"
          disabled={isRendering}
          onClick={() => onSingleRender(short)}
          className="flex-1 py-2 px-3 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
        >
          {isRendering ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>생성 중...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>영상 렌더링</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
