import React, { useState } from 'react';
import { BookOpen, FileText, Copy, Check, ChevronDown, ChevronUp, AlignLeft, Bookmark } from 'lucide-react';

export default function SermonTextView({ sermonData }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const metadata = sermonData?.metadata || {};
  const sermonText = sermonData?.sermonText || '';
  const shorts = sermonData?.shorts || [];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!metadata.title || metadata.title === '설교 제목') {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[#EAE8E1]">
        <BookOpen className="w-8 h-8 text-[#A5A29B] mx-auto mb-2" />
        <p className="text-xs text-[#807D77]">아직 분석된 설교가 없습니다.</p>
        <p className="text-[11px] text-[#A5A29B] mt-1">
          [나의 설교 업로드] 탭에서 유튜브 URL을 분석해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* 설교 메타 카드 */}
      <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#DA7756]" />
          <h2 className="text-sm font-bold text-[#282622] uppercase tracking-wider font-mono">설교 분석 결과</h2>
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

      {/* 하이라이트 쇼츠 목록 (제목/소제목/자막 요약) */}
      {shorts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#DA7756]" />
            <h2 className="text-sm font-bold text-[#282622] uppercase tracking-wider font-mono">
              하이라이트 쇼츠 {shorts.length}개 — 제목 · 소제목 · 자막
            </h2>
          </div>

          <div className="space-y-3">
            {shorts.slice(0, 5).map((short, idx) => (
              <div key={short.id} className="border border-[#EAE8E1] rounded-xl overflow-hidden">
                {/* 헤더 */}
                <div className="p-4 bg-[#FAF9F5] flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#DA7756] text-white font-mono">
                        #{idx + 1}
                      </span>
                      <span className="text-[11px] text-[#807D77] font-mono">{short.startTime} ~ {short.endTime}</span>
                      <span className="text-[11px] text-[#A5A29B] font-mono">{short.duration}</span>
                    </div>
                    {/* 쇼츠 제목 */}
                    <h3 className="text-sm font-black text-[#282622]">{short.title}</h3>
                    {/* 소제목 (질문/답변) */}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {short.title_question && (
                        <span className="text-[11px] font-semibold text-[#807D77] bg-white border border-[#EAE8E1] px-2 py-0.5 rounded-lg">
                          Q. {short.title_question}
                        </span>
                      )}
                      {short.title_answer && (
                        <span className="text-[11px] font-semibold text-[#DA7756] bg-[#FDF4F1] border border-[#DA7756]/20 px-2 py-0.5 rounded-lg">
                          A. {short.title_answer}
                        </span>
                      )}
                    </div>
                    {/* 후크 */}
                    {short.hook && (
                      <p className="text-[11px] text-[#66635E] mt-2 italic leading-relaxed">
                        "{short.hook}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy(
                      `[쇼츠 #${idx + 1}] ${short.title}\n소제목: ${short.title_question} / ${short.title_answer}\n구간: ${short.startTime} ~ ${short.endTime}\n\n자막:\n${(short.sentences || []).map(s => s.text).join('\n')}`
                    )}
                    className="flex-shrink-0 p-2 rounded-lg border border-[#E0DED7] text-[#807D77] hover:bg-white hover:text-[#282622] transition-colors"
                    title="복사"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* 자막 문장 목록 */}
                {short.sentences && short.sentences.length > 0 && (
                  <div className="p-4 space-y-1.5">
                    <span className="text-[10px] font-bold text-[#A5A29B] uppercase tracking-wider font-mono">자막 (설교문)</span>
                    <div className="mt-2 space-y-1">
                      {short.sentences.map((s, si) => (
                        <div key={s.id || si} className="flex items-start gap-2.5 text-xs">
                          <span className="text-[10px] font-mono text-[#A5A29B] flex-shrink-0 w-10 pt-0.5">
                            {s.start}
                          </span>
                          <p className="text-[#282622] leading-relaxed">{s.text}</p>
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
    </div>
  );
}
