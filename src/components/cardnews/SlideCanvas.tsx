import React from 'react';
import { BG_PRESETS } from './EditorControls';
import { Sparkles, BookOpen } from 'lucide-react';
import { CardNewsSlide } from '../../utils/mockData';

interface SlideCanvasProps {
  slide: CardNewsSlide;
  index: number;
  total: number;
  bgTheme: string;
  customBgUrl: string | null;
  fontFamily: 'serif' | 'sans';
  fontSize: 'sm' | 'md' | 'lg';
  aspectRatio: '4:5' | '9:16';
  churchName: string;
  onUpdateSlide?: (slideIndex: number, updatedSlide: CardNewsSlide) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export default function SlideCanvas({
  slide,
  index,
  total,
  bgTheme,
  customBgUrl,
  fontFamily,
  fontSize,
  aspectRatio,
  churchName,
  onUpdateSlide,
  canvasRef,
}: SlideCanvasProps) {
  const currentPreset = BG_PRESETS.find((p) => p.id === bgTheme) || BG_PRESETS[0];

  const bodySizeClass =
    fontSize === 'sm' ? 'text-sm sm:text-base' : fontSize === 'lg' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg';

  const fontClass = fontFamily === 'serif' ? 'font-serif-kr' : 'font-sans-kr';

  const handleContentBlur = (field: keyof CardNewsSlide, e: React.FocusEvent<HTMLElement>) => {
    if (!onUpdateSlide) return;
    const newText = e.currentTarget.innerText;
    onUpdateSlide(index, { ...slide, [field]: newText });
  };

  const isCover = slide.type === 'cover' || index === 0;
  const isClosing = slide.type === 'closing' || index === total - 1;

  const displayTitle = slide.title || (isCover ? '은혜로운 설교 말씀' : `말씀의 핵심 원리 0${index}`);
  const displayBody = slide.body || '주신 말씀을 마음에 깊이 새기며, 일상의 현장에서 믿음으로 승리하십시오.';
  const displayPassage = slide.passage || '';
  const displaySubtitle = slide.subtitle || (isCover ? '말씀의 핵심 원리와 적용' : '');

  const aspectClass = aspectRatio === '4:5' ? 'aspect-[4/5] max-w-[480px]' : 'aspect-[9/16] max-w-[420px]';

  return (
    <div className="flex justify-center p-2 sm:p-4">
      <div
        ref={canvasRef}
        className={`w-full ${aspectClass} rounded-3xl shadow-2xl relative flex flex-col justify-between p-8 sm:p-10 select-text overflow-hidden transition-all duration-300 ${
          customBgUrl ? 'text-white' : currentPreset.style
        }`}
        style={
          customBgUrl
            ? {
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.75)), url(${customBgUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}
        }
      >
        {/* 상단 헤더: 교회명 & 태그 & 페이지 번호 */}
        <div className="flex items-start justify-between gap-4 z-10">
          <div>
            {churchName && (
              <p
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleContentBlur('church', e)}
                className="text-[11px] sm:text-xs font-semibold tracking-wider opacity-80 uppercase leading-snug whitespace-pre-line cursor-text outline-none hover:bg-black/10 px-1 rounded transition-colors"
                title="클릭하여 교회명 수정"
              >
                {slide.church || churchName}
              </p>
            )}
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[10px] sm:text-xs font-bold tracking-widest uppercase">
              <Sparkles className="w-3 h-3" />
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleContentBlur('tag', e)}
                className="cursor-text outline-none"
                title="클릭하여 태그 수정"
              >
                {slide.tag || (isCover ? '설교 요약' : isClosing ? '결단과 기도' : `Point 0${index}`)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono text-xs sm:text-sm font-bold opacity-60">
              {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* 중앙 콘텐츠 영역 */}
        <div className={`my-auto z-10 ${fontClass}`}>
          {isCover ? (
            <div className="space-y-4 text-center sm:text-left">
              <div className="w-12 h-1 bg-amber-400 mb-6 rounded-full mx-auto sm:mx-0"></div>
              <h1
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleContentBlur('title', e)}
                className="text-2xl sm:text-4xl font-extrabold leading-tight whitespace-pre-line cursor-text outline-none hover:bg-black/10 p-1 rounded transition-colors"
                title="클릭하여 표지 제목 수정"
              >
                {displayTitle}
              </h1>

              {displaySubtitle && (
                <p
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleContentBlur('subtitle', e)}
                  className="text-sm sm:text-base opacity-85 font-medium cursor-text outline-none hover:bg-black/10 p-1 rounded transition-colors"
                  title="클릭하여 부제 수정"
                >
                  {displaySubtitle}
                </p>
              )}

              {displayPassage && (
                <div className="pt-4 flex items-center justify-center sm:justify-start gap-2 opacity-80 text-xs sm:text-sm font-semibold">
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleContentBlur('passage', e)}
                    className="cursor-text outline-none"
                    title="클릭하여 성경구절 수정"
                  >
                    {displayPassage}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleContentBlur('title', e)}
                className="text-xl sm:text-2xl font-bold leading-snug whitespace-pre-line cursor-text outline-none hover:bg-black/10 p-1 rounded transition-colors"
                title="클릭하여 소제목 수정"
              >
                {displayTitle}
              </h2>

              <div className="w-10 h-0.5 bg-white/30 rounded-full my-3"></div>

              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleContentBlur('body', e)}
                className={`${bodySizeClass} font-normal leading-relaxed whitespace-pre-line cursor-text outline-none hover:bg-black/10 p-1 rounded transition-colors opacity-95`}
                title="클릭하여 본문 내용 수정"
              >
                {displayBody}
              </div>
            </div>
          )}
        </div>

        {/* 하단 푸터 */}
        <div className="pt-4 border-t border-white/15 flex items-center justify-between text-[11px] sm:text-xs opacity-70 z-10">
          <span>{slide.speaker || slide.church || churchName || '주일 설교 시리즈'}</span>
          <span className="text-[10px] tracking-widest uppercase">SWIPE &rarr;</span>
        </div>

        {/* 은은한 배경 데코 그라디언트 블러 오버레이 */}
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-amber-400/10 blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
}
