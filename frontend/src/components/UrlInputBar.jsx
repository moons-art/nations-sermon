import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Link2, Wand2, Clock } from 'lucide-react';
import YoutubeIcon from './YoutubeIcon';

export default function UrlInputBar({ onAnalyze, isLoading, currentTitle }) {
  const [url, setUrl] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let timer;
    if (isLoading) {
      setElapsed(0);
      timer = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onAnalyze(url.trim());
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 mb-8 transition-all">
      <div className="max-w-3xl mx-auto text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
          <Wand2 className="w-3.5 h-3.5" />
          <span>원클릭 설교 멀티미디어 변환</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          유튜브 설교 영상 링크를 넣어주세요
        </h1>
        <p className="text-sm text-slate-500">
          AI가 설교 핵심을 파악하여 <strong className="text-slate-800">쇼츠 6편</strong>, <strong className="text-slate-800">5일치 묵상집</strong>, <strong className="text-slate-800">인스타 카드뉴스</strong>를 즉시 자동 제작합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <div className="flex items-center gap-3 pl-3 w-full sm:w-auto flex-1">
            <YoutubeIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="분석할 유튜브 설교 영상 URL을 입력하세요 (예: https://www.youtube.com/watch?v=...)"
              className="w-full bg-transparent text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none py-1.5"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>설교 분석 중 ({elapsed}초)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI 분석 시작 (약 25~35초)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* 실시간 진행 상태 및 예상 소요 시간 박스 */}
      {isLoading && (
        <div className="max-w-3xl mx-auto mt-4 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between font-semibold text-indigo-950">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
              <span>AI가 설교 영상(자막 대본)을 정밀 분석하고 있습니다</span>
            </div>
            <span className="font-mono text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {elapsed}초 경과 / 약 25~35초 소요
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full bg-indigo-200/50 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${
                  elapsed <= 30
                    ? Math.min(85, Math.max(8, (elapsed / 30) * 85))
                    : Math.min(96, 85 + ((elapsed - 30) / 15) * 11)
                }%`,
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] text-indigo-800 gap-1">
            <span className="font-medium">
              {elapsed < 4
                ? '1단계: 유튜브 영상 정보 및 1,000+개 설교 자막(대본) 추출 중...'
                : elapsed < 26
                ? '2단계: Gemini 3.8 Flash가 설교 핵심, 쇼츠 6편(2줄 헤더/타임스탬프), 5일 묵상집을 심층 분석 중...'
                : elapsed < 38
                ? '3단계: 카드뉴스 2종 구성 및 데이터 규격 완성 중...'
                : '4단계: 최종 마무리 단계입니다. 곧 화면이 전환됩니다...'}
            </span>
            <span className="font-semibold text-indigo-600 flex-shrink-0">예상: 약 25~35초 (풀 설교 기준)</span>
          </div>
        </div>
      )}

      {/* 분석 완료된 설교 헤더 안내 */}
      {currentTitle && !isLoading && (
        <div className="max-w-3xl mx-auto mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-medium text-slate-700 truncate">현재 분석된 설교: {currentTitle}</span>
          </div>
          <span className="text-indigo-600 font-semibold flex-shrink-0">3개 탭에서 자유롭게 편집/다운로드</span>
        </div>
      )}
    </div>
  );
}
