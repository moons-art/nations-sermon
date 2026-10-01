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
  onUpdateTitles,
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

  // 템플릿별 시각 디자인 프리셋
  const templateStyles = {
    cinema_letterbox: {
      cardBg: 'bg-[#0B0C0E]',
      bgType: 'wide',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/20 text-white',
      isLetterbox: true,
    },
    blue_wide: {
      cardBg: 'bg-[#1E62D0]',
      bgType: 'wide',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-white/20 text-white',
      isLetterbox: true,
    },
    yellow_wide: {
      cardBg: 'bg-[#F4CF42]',
      bgType: 'wide',
      qColor: 'text-[#121212]',
      aColor: 'text-[#181A22]',
      subBg: 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
      tagBg: 'bg-black/10 text-black',
      isLetterbox: true,
    },
    transparent_minimal: {
      cardBg: 'bg-[#1C1D22]',
      bgType: 'transparent',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'bg-black/90 text-white border-white/20 font-black shadow-lg',
      tagBg: 'bg-white/10 text-white/90',
    },
    dark_minimal: {
      cardBg: 'bg-[#0E0E10]',
      bgType: 'minimal',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'bg-black/90 text-white border-white/20 font-black shadow-lg',
      tagBg: 'bg-white/10 text-white/90',
    },
    yellow_minimal: {
      cardBg: 'bg-[#F4CF42]',
      bgType: 'minimal',
      qColor: 'text-[#121212]',
      aColor: 'text-[#181A22]',
      subBg: 'bg-black/90 text-white border-white/20 font-black shadow-lg',
      tagBg: 'bg-black/10 text-black',
    },
    full_cinema: {
      cardBg: 'bg-black',
      bgType: 'fullscreen',
      qColor: 'text-white',
      aColor: 'text-[#FFE600]',
      subBg: 'bg-black/90 text-white border-white/20 font-black shadow-lg',
      tagBg: 'bg-white/20 text-white',
    },
  };

  const currentTpl = templateStyles[template] || templateStyles.dark_minimal;
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500&auto=format&fit=crop&q=80';

  return (
    <div
      className={`bg-white rounded-2xl p-3 border-2 transition-all flex flex-col justify-between shadow-xs ${
        isSelected
          ? 'border-[#DA7756] ring-2 ring-[#DA7756]/20'
          : 'border-[#EAE8E1] hover:border-[#DCD9CF]'
      }`}
    >
      <div>
        {/* 상단 번호 & 타임스탬프 & 선택 체크박스 */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 rounded-md bg-[#282622] text-white font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              #{index + 1}
            </span>
            <span className="text-[10px] font-mono text-[#807D77] flex items-center gap-1 bg-[#FAF9F5] px-1.5 py-0.5 rounded border border-[#EAE8E1] truncate">
              <Clock className="w-3 h-3 text-[#A5A29B] flex-shrink-0" />
              {short.startTime}~{short.endTime}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggleSelect(short.id)}
            className="text-[#807D77] hover:text-[#DA7756] p-0.5"
            title="쇼츠 선택"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-[#DA7756]" />
            ) : (
              <Square className="w-4 h-4 text-[#DCD9CF]" />
            )}
          </button>
        </div>

        {/* 9:16 비율 실시간 비디오 / 템플릿 프리뷰 플레이어 (선택된 템플릿 실시간 반영) */}
        <div className="relative w-full aspect-[9/13.5] rounded-xl overflow-hidden border border-[#EAE8E1] shadow-inner mb-2 bg-black select-none">
          {short.video_url ? (
            <video
              src={short.video_url}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          ) : isPlaying && videoId ? (
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
                className="absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-bold hover:bg-black flex items-center gap-1 border border-white/20"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>템플릿</span>
              </button>
            </div>
          ) : (
            <div className={`relative w-full h-full flex flex-col justify-between p-2 select-none overflow-hidden ${currentTpl.cardBg}`}>
              {/* 풀스크린 / 투명 미니멀인 경우 전체 배경 썸네일 (풀스크린은 썸네일이 선명하게 보이도록 고투명도 적용) */}
              {(currentTpl.bgType === 'fullscreen' || currentTpl.bgType === 'transparent') && (
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={thumbnailUrl}
                    alt="설교 영상 썸네일"
                    className={`w-full h-full object-cover ${currentTpl.bgType === 'fullscreen' ? 'opacity-90' : 'opacity-70'} scale-105`}
                  />
                  <div className={`absolute inset-0 ${currentTpl.bgType === 'fullscreen' ? 'bg-gradient-to-b from-black/70 via-transparent to-black/85' : 'bg-gradient-to-b from-black/80 via-transparent to-black/90'} pointer-events-none`} />
                </div>
              )}

              {/* 상단: 템플릿 헤더 (검은 글자일 때는 검은 그림자 제거) */}
              <div className={`relative z-10 w-full text-center px-1 leading-tight ${currentTpl.isLetterbox ? 'pt-2 pb-1' : 'pt-2.5 pb-1'}`}>
                <h4 className={`text-base sm:text-[17px] font-black leading-tight tracking-tight line-clamp-2 ${currentTpl.qColor.includes('white') ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]' : ''} ${currentTpl.qColor}`}>
                  {questionTitle}
                </h4>
                <p className={`text-xs sm:text-[13px] font-black leading-snug line-clamp-1 mt-1 ${currentTpl.aColor.includes('white') ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]' : ''} ${currentTpl.aColor}`}>
                  {answerTitle}
                </p>
              </div>

              {/* 중앙 영상 썸네일 및 재생 버튼 영역 */}
              {currentTpl.isLetterbox ? (
                /* 와이드 계열 (와이드, 블루 와이드, 옐로우 와이드): 템플릿 프레임 내부 중앙에 영상 배치 */
                <div className="relative z-10 w-full aspect-[16/11] bg-black rounded-lg overflow-hidden shadow-md my-auto flex flex-col justify-end border border-black/20 group/play">
                  <img
                    src={thumbnailUrl}
                    alt="설교 영상 썸네일"
                    className="absolute inset-0 w-full h-full object-cover opacity-90 scale-110"
                  />
                  {/* 중앙 재생 버튼 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/play:bg-black/10 transition-colors">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(true)}
                      className="w-9 h-9 rounded-full bg-[#DA7756] hover:bg-[#C56545] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      title="이 구간 영상 미리보기 재생"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                  </div>
                  {/* 영상 내부 하단 자막: 얇고 선명한 1px 검은 외곽선 적용 */}
                  <div className="relative z-10 w-full px-2 py-1 mb-1 mx-auto max-w-[95%] text-center">
                    <p className="text-[11px] sm:text-[12px] text-white font-black leading-snug break-keep line-clamp-2 [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]">
                      "{firstSubtitle}"
                    </p>
                  </div>
                </div>
              ) : currentTpl.bgType === 'fullscreen' ? (
                /* 풀스크린 계열: 배경에 영상이 꽉 차고 중앙에 재생 버튼 배치 */
                <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="w-11 h-11 rounded-full bg-[#DA7756] hover:bg-[#C56545] text-white flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/30"
                    title="이 구간 영상 미리보기 재생"
                  >
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </button>
                </div>
              ) : (
                /* 미니멀 계열 (블랙 미니멀, 옐로우 미니멀, 투명 미니멀): 영상 영역이 명확히 보이도록 16:9 비디오 썸네일 박스 렌더링 */
                <div className="relative z-10 w-full aspect-video bg-black/80 rounded-lg overflow-hidden shadow-md my-auto flex items-center justify-center border border-white/20 group/play">
                  <img
                    src={thumbnailUrl}
                    alt="설교 영상 썸네일"
                    className="absolute inset-0 w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-black/25 group-hover/play:bg-black/10 transition-colors" />
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="relative z-10 w-9 h-9 rounded-full bg-[#DA7756] hover:bg-[#C56545] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    title="이 구간 영상 미리보기 재생"
                  >
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </button>
                </div>
              )}

              {/* 하단: 자막(검은 배경카드 제거, 얇고 깔끔한 1px 검은 테두리 씌움, 2줄 표시) 및 교회 로고 */}
              <div className="relative z-10 w-full space-y-2 text-center pb-2">
                {currentTpl.isLetterbox ? null : (
                  <div className="px-1 text-center -mt-2 mb-1 min-h-[2.85rem] flex items-center justify-center">
                    <p className="text-xs sm:text-[13.5px] text-white font-black leading-snug break-keep line-clamp-2 [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]">
                      "{firstSubtitle}"
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-center gap-1 text-[9.5px] font-bold opacity-80 truncate">
                  <span className={currentTpl.isLetterbox ? currentTpl.qColor : 'text-white'}>
                    ✝ {churchName.replace('\n', ' ') || '예배공동체'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 인라인 제목 및 소제목 수정칸 (노출형 입력 필드) ── */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-bold text-[#807D77] uppercase tracking-wider flex items-center justify-between">
            <span>제목 · 소제목 편집</span>
            {videoId && (
              <a
                href={`https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`}
                target="_blank"
                rel="noreferrer"
                className="text-[9.5px] text-[#DA7756] hover:underline flex items-center gap-0.5"
              >
                <span>유튜브</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          <div className="space-y-1">
            <input
              type="text"
              value={questionTitle}
              onChange={(e) => onUpdateTitles?.(e.target.value, answerTitle)}
              placeholder="제목 (상단 1줄)"
              className="w-full text-xs font-bold text-[#282622] bg-[#FAF9F5] border border-[#E0DED7] rounded-lg px-2 py-1 focus:outline-none focus:border-[#DA7756]"
              title="상단 1줄 제목 편집"
            />
            <input
              type="text"
              value={answerTitle}
              onChange={(e) => onUpdateTitles?.(questionTitle, e.target.value)}
              placeholder="소제목 (상단 2줄)"
              className="w-full text-xs font-bold text-[#DA7756] bg-[#FAF9F5] border border-[#E0DED7] rounded-lg px-2 py-1 focus:outline-none focus:border-[#DA7756]"
              title="상단 2줄 소제목 편집"
            />
          </div>
        </div>
      </div>

      {/* 하단 액션 버튼: [영상 생성] 단일화 (수정 버튼 제거) */}
      <div className="pt-2.5 mt-2.5 border-t border-[#F2EFE8]">
        <button
          type="button"
          disabled={isRendering}
          onClick={() => onSingleRender(short)}
          className="w-full py-2 px-3 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer active:scale-95"
        >
          {isRendering ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>생성 중...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>영상 생성</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
