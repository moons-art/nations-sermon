import React, { useState } from 'react';
import { BookOpen, FileText, Copy, Check, ChevronDown, ChevronUp, AlignLeft, Bookmark, Film, ArrowRight, ArrowLeft, Search, List, X, Calendar, Trash2 } from 'lucide-react';

export default function SermonTextView({
  sermonData,
  onNavigateToShorts,
  onNavigateToCards,
  onNavigateToUpload,
  sermonHistory = [],
  onSelectHistory,
  onDeleteHistory,
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const metadata = sermonData?.metadata || {};
  const sermonText = sermonData?.sermonText || '';
  const shorts = sermonData?.shorts || [];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredHistory = sermonHistory.filter((item) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.church || '').toLowerCase().includes(q) ||
      (item.preacher || '').toLowerCase().includes(q)
    );
  });

  if (!metadata.title || metadata.title === '설교 제목') {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[#EAE8E1]">
        <BookOpen className="w-8 h-8 text-[#A5A29B] mx-auto mb-2" />
        <p className="text-xs text-[#807D77]">아직 분석된 설교가 없습니다.</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          {onNavigateToUpload && (
            <button
              onClick={onNavigateToUpload}
              className="px-3.5 py-1.5 rounded-xl bg-[#282622] text-white text-xs font-semibold hover:bg-[#1E1D1A] transition-colors"
            >
              설교 업로드로 이동
            </button>
          )}
          {sermonHistory.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-1.5 rounded-xl border border-[#E0DED7] text-xs font-semibold text-[#66635E] hover:bg-[#FAF9F5] transition-colors"
            >
              설교분석 기록 ({sermonHistory.length}개) 보기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* 설교 메타 카드 */}
      <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#DA7756]" />
            <h2 className="text-sm font-bold text-[#282622] uppercase tracking-wider font-mono">설교 분석 결과</h2>
          </div>

          {/* 상단 액션 버튼들: 목록/검색, 목록으로 돌아가기, 영상 생성, 카드뉴스 생성 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 목록으로 돌아가기 */}
            {onNavigateToUpload && (
              <button
                type="button"
                onClick={onNavigateToUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0DED7] hover:bg-[#FAF9F5] text-xs font-semibold text-[#66635E] transition-colors cursor-pointer"
                title="설교 업로드 및 전체 기록 목록으로 돌아가기"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>목록으로 돌아가기</span>
              </button>
            )}

            {/* 설교분석기록 목록 및 검색 팝업 버튼 */}
            {sermonHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DA7756]/30 bg-[#FAF9F5] text-[#DA7756] hover:bg-[#DA7756]/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>설교기록 목록 & 검색 ({sermonHistory.length})</span>
              </button>
            )}

            {/* [카드뉴스 만들기] 버튼 */}
            {onNavigateToCards && (
              <button
                type="button"
                onClick={onNavigateToCards}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0DED7] bg-white hover:bg-[#FAF9F5] text-[#282622] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#DA7756]" />
                <span>카드뉴스 생성</span>
              </button>
            )}

            {/* 내용 상단: [숏폼영상 만들기] 버튼 */}
            {shorts.length > 0 && onNavigateToShorts && (
              <button
                type="button"
                onClick={onNavigateToShorts}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#DA7756] hover:bg-[#C56545] text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>숏폼영상 생성</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 썸네일 + 메타 */}
        <div className="flex gap-5 items-start">
          {metadata.thumbnail && (
            <img
              src={metadata.thumbnail}
              alt="썸네일"
              className="w-32 h-20 object-cover rounded-xl border border-[#EAE8E1] flex-shrink-0"
            />
          )}
          <div className="flex-1 space-y-2.5">
            {/* 설교 제목 */}
            <div>
              <span className="text-[10px] font-bold text-[#A5A29B] uppercase tracking-wider font-mono">설교 제목</span>
              <h1 className="text-lg font-black text-[#282622] leading-tight mt-0.5">{metadata.title}</h1>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 성경 본문 */}
              <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#EAE8E1]">
                <span className="text-[10px] font-bold text-[#A5A29B] uppercase tracking-wider font-mono block mb-1">성경 본문</span>
                <div className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-[#DA7756] flex-shrink-0" />
                  <span className="text-sm font-bold text-[#DA7756]">{metadata.passage || '—'}</span>
                </div>
              </div>

              {/* 설교자 */}
              <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#EAE8E1]">
                <span className="text-[10px] font-bold text-[#A5A29B] uppercase tracking-wider font-mono block mb-1">설교자 / 교회</span>
                <p className="text-xs font-semibold text-[#282622]">{metadata.preacher || '—'}</p>
                <p className="text-[11px] text-[#807D77]">{metadata.churchName || '—'}</p>
              </div>
            </div>

            {/* 영상 길이 / 날짜 */}
            <div className="flex items-center gap-3 text-[11px] text-[#A5A29B] font-mono">
              {metadata.videoDuration && <span>⏱ {metadata.videoDuration}</span>}
              {metadata.publishedAt && <span>📅 {metadata.publishedAt}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 숏폼 목록 (상단 설명 제목 삭제, 숏폼1~5 포맷) */}
      {shorts.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-3">
            {shorts.slice(0, 5).map((short, idx) => (
              <div key={short.id} className="bg-white border border-[#EAE8E1] rounded-2xl overflow-hidden shadow-xs">
                {/* 헤더: 숏폼 번호 & 제목 / 소제목 */}
                <div className="p-4 bg-[#FAF9F5] border-b border-[#EAE8E1] flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#282622] text-white font-mono">
                        숏폼 {idx + 1}
                      </span>
                      <span className="text-[11px] text-[#807D77] font-mono bg-white px-2 py-0.5 rounded border border-[#EAE8E1]">
                        {short.startTime} ~ {short.endTime} ({short.duration})
                      </span>
                    </div>

                    {/* 제목 */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-[#807D77] flex-shrink-0">제목:</span>
                      <h3 className="text-sm font-black text-[#282622]">{short.title}</h3>
                    </div>

                    {/* 소제목 */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#807D77] flex-shrink-0">소제목:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {short.title_question && (
                          <span className="text-xs font-semibold text-[#282622] bg-white border border-[#E0DED7] px-2 py-0.5 rounded-md">
                            {short.title_question}
                          </span>
                        )}
                        {short.title_answer && (
                          <span className="text-xs font-bold text-[#DA7756] bg-[#FDF4F1] border border-[#DA7756]/20 px-2 py-0.5 rounded-md">
                            {short.title_answer}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(
                      `[숏폼 ${idx + 1}]\n제목: ${short.title}\n소제목: ${short.title_question} / ${short.title_answer}\n구간: ${short.startTime} ~ ${short.endTime}\n\n자막:\n${(short.sentences || []).map(s => s.text).join('\n')}`
                    )}
                    className="flex-shrink-0 p-2 rounded-lg border border-[#E0DED7] text-[#807D77] hover:bg-white hover:text-[#282622] transition-colors"
                    title="복사"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* 자막 */}
                {short.sentences && short.sentences.length > 0 && (
                  <div className="p-4 bg-white space-y-2">
                    <span className="text-xs font-bold text-[#807D77] block">자막:</span>
                    <div className="space-y-1.5 pl-1">
                      {short.sentences.map((s, si) => (
                        <div key={s.id || si} className="flex items-start gap-2.5 text-xs">
                          <span className="text-[10px] font-mono text-[#A5A29B] flex-shrink-0 w-10 pt-0.5">
                            {s.start}
                          </span>
                          <p className="text-[#282622] leading-relaxed font-medium">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 설교문 */}
      <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-[#DA7756]" />
            <h2 className="text-sm font-bold text-[#282622] uppercase tracking-wider font-mono">전체 설교문</h2>
            {sermonText && (
              <span className="text-[10px] text-[#A5A29B] font-mono">
                {sermonText.length.toLocaleString()}자
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sermonText && (
              <button
                onClick={() => handleCopy(sermonText)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0DED7] text-xs font-medium text-[#66635E] hover:bg-[#FAF9F5] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨!' : '전체 복사'}</span>
              </button>
            )}
          </div>
        </div>

        {sermonText ? (
          <div className="space-y-3">
            <div
              className={`text-sm text-[#282622] leading-[1.9] whitespace-pre-wrap font-serif-kr ${
                !expanded ? 'line-clamp-[12]' : ''
              }`}
              style={{ fontFamily: 'Georgia, "Noto Serif KR", serif' }}
            >
              {sermonText}
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#DA7756] hover:text-[#C56545] transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>접기</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>전체 설교문 보기</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-10 bg-[#FAF9F5] rounded-xl border border-[#EAE8E1]">
            <AlignLeft className="w-6 h-6 text-[#A5A29B] mx-auto mb-2" />
            <p className="text-xs text-[#807D77]">설교문이 추출되지 않았습니다.</p>
            <p className="text-[11px] text-[#A5A29B] mt-1">
              자막이 포함된 영상을 다시 분석해주세요.
            </p>
          </div>
        )}
      </div>

      {/* 설교분석기록 목록 & 검색 모달 */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[#FAF9F5] rounded-2xl shadow-2xl max-w-2xl w-full p-5 border border-[#EAE8E1] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE8E1]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#DA7756]" />
                <h3 className="text-sm font-bold text-[#282622]">설교분석 기록 목록</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold font-mono">
                  총 {sermonHistory.length}편
                </span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-[#807D77] hover:text-[#282622] hover:bg-[#EFECE3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 검색창 */}
            <div className="py-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#807D77] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="설교 제목, 설교자, 교회명으로 검색..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl border border-[#E0DED7] text-xs focus:outline-none focus:border-[#DA7756] bg-white transition-all placeholder:text-[#A5A29B]"
                  autoFocus
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A5A29B] hover:text-[#66635E]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 기록 목록 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-[#807D77] text-xs">
                  검색 조건과 일치하는 설교 기록이 없습니다.
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isCurrent = item.title === metadata.title;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#DA7756]/10 border-[#DA7756]'
                          : 'bg-white border-[#EAE8E1] hover:border-[#DA7756]/50 hover:shadow-xs'
                      }`}
                    >
                      <div
                        onClick={() => {
                          if (onSelectHistory) onSelectHistory(item);
                          setShowHistoryModal(false);
                        }}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#DA7756] text-white font-bold">
                              현재 분석
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-[#282622] truncate hover:text-[#DA7756]">{item.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#807D77] flex-wrap">
                          {item.church && <span>{item.church}</span>}
                          {item.preacher && <span>&bull; {item.preacher}</span>}
                          <span>&bull; {item.date}</span>
                          <span className="text-[#DA7756] font-semibold">&bull; 쇼츠 {item.shortsCount || 5}개</span>
                        </div>
                      </div>

                      {/* 액션 버튼 그룹: 열람, 숏폼 생성, 카드뉴스 생성, 삭제 */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectHistory) onSelectHistory(item);
                            setShowHistoryModal(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#282622] text-white text-[11px] font-semibold hover:bg-[#1E1D1A] transition-colors cursor-pointer"
                          title="설교 분석 결과 열람"
                        >
                          열람
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectHistory) onSelectHistory(item);
                            setShowHistoryModal(false);
                            if (onNavigateToShorts) onNavigateToShorts();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DA7756] hover:bg-[#C56545] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          title="이 설교로 숏폼 영상 생성하기"
                        >
                          <Film className="w-3 h-3" />
                          <span>영상 생성</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectHistory) onSelectHistory(item);
                            setShowHistoryModal(false);
                            if (onNavigateToCards) onNavigateToCards();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E0DED7] bg-white hover:bg-[#FAF9F5] text-[#282622] text-[11px] font-semibold transition-colors cursor-pointer"
                          title="이 설교로 카드뉴스 생성하기"
                        >
                          <Bookmark className="w-3 h-3 text-[#DA7756]" />
                          <span>카드뉴스</span>
                        </button>
                        {onDeleteHistory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`'${item.title}' 설교 기록을 삭제하시겠습니까?`)) {
                                onDeleteHistory(item.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-[#E0DED7] text-[#A5A29B] hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[#EAE8E1] flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl border border-[#E0DED7] text-xs text-[#66635E] hover:bg-[#EFECE3]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
