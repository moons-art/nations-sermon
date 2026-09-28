import React, { useState, useEffect } from 'react';
import { Search, Layers, Calendar, ArrowRight, BookOpen, Clock, Download, Eye } from 'lucide-react';

export default function CardListView({ sermonData, onSelectCardSet, onView }) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (onView) onView();
  }, []);

  // 카드 목록 데이터셋 (실제 AI 분석 데이터 기반 동적 생성)
  const baseTitle = sermonData?.metadata?.title || '은혜로운 주일 설교 말씀';
  const basePassage = sermonData?.metadata?.passage || '성경 본문 말씀';
  const baseDate = sermonData?.metadata?.publishedAt || '주일 설교';

  // 1) 주일 설교 전체 요약 카드 세트
  const fullSermonCollection = {
    id: 'full-sermon-1',
    type: 'sermon',
    category: '설교카드 (7장)',
    title: baseTitle,
    passage: basePassage,
    date: baseDate,
    slideCount: sermonData?.sermonCardNews?.length || 7,
    preview: sermonData?.sermonCardNews?.[1]?.title || sermonData?.shorts?.[0]?.summary || '설교 본론 핵심 요약 및 믿음의 결단',
    themeColor: '#181D27',
    subTab: 'full_sermon',
    day: null,
  };

  // 2) 5Day 묵상 카드뉴스 세트 (월~금 동적 바인딩)
  const dayColors = ['#3A1D28', '#14281D', '#DA7756', '#181D27', '#2E2036'];
  const dayNames = ['월요일', '화요일', '수요일', '목요일', '금요일'];
  const rawMeditations = sermonData?.meditations || [];

  const dailyCollections = Array.from({ length: 5 }, (_, idx) => {
    const dayNum = idx + 1;
    const dayKey = String(dayNum);
    const med = rawMeditations[idx] || {};
    const dayName = med.dayName || dayNames[idx];
    const theme = med.theme || `${baseTitle} - ${dayName} 묵상`;
    const passage = med.bibleVerse ? med.bibleVerse.split('\n')[0] : basePassage;
    const preview = med.application || (med.content ? med.content.slice(0, 60) + '...' : '오늘 하루 말씀 묵상과 삶의 적용');
    const slideCount = sermonData?.dailyCardNewsSets?.[dayKey]?.length || 4;

    return {
      id: `daily-set-${dayNum}`,
      type: 'meditation',
      category: `5Day 묵상카드 • ${dayName}`,
      title: theme,
      passage: passage,
      date: `Day ${dayNum} (${dayName.charAt(0)})`,
      slideCount: slideCount,
      preview: preview,
      themeColor: dayColors[idx % dayColors.length],
      subTab: 'daily',
      day: dayKey,
    };
  });

  const cardCollections = [fullSermonCollection, ...dailyCollections];

  // 검색 필터링
  const filteredCollections = cardCollections.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.passage.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.preview.toLowerCase().includes(q) ||
      item.date.includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* 상단 타이틀 & 검색창 */}
      <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#DA7756]" />
              <h2 className="text-base font-bold text-[#282622]">카드설교 목록</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFECE3] text-[#66635E] font-mono">
                {filteredCollections.length}개 세트
              </span>
            </div>
            <p className="text-xs text-[#807D77] mt-0.5">
              날짜별로 제작된 설교 요약 카드와 5일치 묵상 카드뉴스 세트 목록입니다.
            </p>
          </div>

          {/* 검색 바 */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#807D77] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="제목, 성경구절, 요일 검색..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] placeholder-[#A5A29B] focus:outline-none focus:border-[#DA7756]"
            />
          </div>
        </div>
      </div>

      {/* 날짜별 카드 목록 리스트 */}
      <div className="space-y-3">
        {filteredCollections.map((col) => (
          <div
            key={col.id}
            className="bg-white rounded-2xl p-5 border border-[#EAE8E1] hover:border-[#DCD9CF] hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            {/* 좌측 정보 */}
            <div className="flex items-start gap-4">
              {/* 미니 썸네일 목업 */}
              <div
                className="w-14 h-16 rounded-xl flex-shrink-0 flex flex-col justify-between p-1.5 text-white shadow-xs"
                style={{ backgroundColor: col.themeColor }}
              >
                <span className="text-[8px] font-mono opacity-70">CARD</span>
                <span className="text-[10px] font-bold text-center leading-tight line-clamp-2">
                  {col.type === 'sermon' ? '설교' : '묵상'}
                </span>
                <span className="text-[8px] text-right font-mono opacity-80">{col.slideCount}P</span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-[#DA7756] font-semibold bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#EAE8E1]">
                    {col.category}
                  </span>
                  <span className="text-[11px] font-mono text-[#807D77] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#A5A29B]" />
                    {col.date}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#282622] group-hover:text-[#DA7756] transition-colors">
                  {col.title}
                </h3>

                <p className="text-xs text-[#66635E] mt-1 line-clamp-1">
                  {col.preview}
                </p>

                <div className="flex items-center gap-1.5 text-[11px] text-[#807D77] mt-1 font-serif-kr">
                  <BookOpen className="w-3 h-3 text-[#A5A29B]" />
                  <span>{col.passage}</span>
                </div>
              </div>
            </div>

            {/* 우측 열기 버튼 */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => onSelectCardSet(col.subTab, col.day)}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>에디터에서 열기</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        ))}

        {filteredCollections.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#EAE8E1]">
            <p className="text-xs text-[#807D77]">검색된 카드설교 세트가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
