import React, { useState, useEffect, useRef } from 'react';
import { Layers, Calendar, Sparkles, Loader2 } from 'lucide-react';
import EditorControls from './EditorControls';
import SlideCanvas from './SlideCanvas';
import SlideNavigator from './SlideNavigator';

const BASE_URL = 'http://127.0.0.1:8000';

export default function CardNewsTab({
  sermonData,
  setSermonData,
  targetSubTab = 'full_sermon',
  targetDay = '1',
  apiKey = '',
}) {
  const canvasRef = useRef(null);

  // 'full_sermon' (설교카드 7장) | 'daily' (5day 묵상카드)
  const [subTab, setSubTab] = useState(targetSubTab);
  const [selectedDailyDay, setSelectedDailyDay] = useState(targetDay);

  // 설교카드 생성 버튼 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  useEffect(() => {
    if (targetSubTab) setSubTab(targetSubTab);
    if (targetDay) setSelectedDailyDay(targetDay);
  }, [targetSubTab, targetDay]);

  // 이미 sermonCardNews 나 dailyCardNewsSets 데이터가 있으면 생성됨 처리
  useEffect(() => {
    const hasFullCards = sermonData?.sermonCardNews?.length > 0;
    const hasDailyCards = sermonData?.dailyCardNewsSets &&
      Object.keys(sermonData.dailyCardNewsSets).length > 0;
    if (hasFullCards || hasDailyCards) {
      setIsGenerated(true);
    }
  }, [sermonData]);

  // 에디터 스타일 상태
  const [bgTheme, setBgTheme] = useState('navy');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [fontFamily, setFontFamily] = useState('serif');
  const [fontSize, setFontSize] = useState('md');
  const [aspectRatio, setAspectRatio] = useState('4:5');
  const [churchName, setChurchName] = useState(sermonData.metadata?.churchName || '예배공동체');

  const [currentIndex, setCurrentIndex] = useState(0);

  const isFullSermon = subTab === 'full_sermon';

  // 설교카드 생성 핸들러 (과금 방지: 이미 카드가 있으면 재호출 방지)
  const handleGenerateCards = async () => {
    const hasFullCards = sermonData?.sermonCardNews?.length > 0;
    const hasDailyCards = sermonData?.dailyCardNewsSets && Object.keys(sermonData.dailyCardNewsSets).length > 0;

    if (hasFullCards && hasDailyCards) {
      // 이미 분석 시 생성된 카드가 완벽히 존재함 -> API 호출 없이 즉시 표시
      setIsGenerated(true);
      return;
    }

    setIsGenerating(true);
    try {
      // 백엔드에 텍스트 기반 설교카드 분석 요청
      const title = sermonData?.metadata?.title || '';
      const sermonText = buildSermonText(sermonData);

      if (!sermonText || sermonText.trim().length < 50) {
        throw new Error('카드뉴스를 생성할 설교문 내용이 충분하지 않습니다.');
      }

      const res = await fetch(`${BASE_URL}/api/sermon/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sermon_text: sermonText, gemini_api_key: apiKey || '' }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || '백엔드 서버 카드 생성 실패');
      }

      const json = await res.json();
      if (json.data) {
        setSermonData(prev => ({
          ...prev,
          sermonCardNews: json.data.sermonCardNews || prev.sermonCardNews,
          dailyCardNewsSets: json.data.dailyCardNewsSets || prev.dailyCardNewsSets,
        }));
        setIsGenerated(true);
      } else {
        throw new Error('카드 생성 결과 데이터가 비어있습니다.');
      }
    } catch (err) {
      console.error('카드 생성 오류:', err);
      alert('카드뉴스 생성 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 설교 데이터를 텍스트로 변환 (카드 생성용)
  const buildSermonText = (data) => {
    const meta = data?.metadata || {};
    const parts = [];
    if (meta.title) parts.push(`제목: ${meta.title}`);
    if (meta.passage) parts.push(`본문: ${meta.passage}`);
    if (meta.preacher) parts.push(`설교자: ${meta.preacher}`);
    data?.shorts?.forEach((s, i) => {
      parts.push(`\n핵심 ${i+1}: ${s.title}\n${s.summary || ''}`);
    });
    data?.meditations?.forEach((m, i) => {
      parts.push(`\nDay ${i+1} 묵상: ${m.theme}\n${(m.content||'').slice(0,200)}`);
    });
    return parts.join('\n');
  };

  // 100% 완전한 슬라이드 데이터 보장 (누락 시 메타데이터 및 묵상 데이터에서 즉각 복원)
  const getFallbackSlides = () => {
    const meta = sermonData.metadata || {};
    const title = meta.title || '은혜로운 주일 설교 말씀';
    const passage = meta.passage || '성경 본문';
    const preacher = meta.preacher || '담임목사';
    const church = churchName || meta.churchName || '예배공동체';

    if (isFullSermon) {
      const cards = [
        {
          id: 1,
          type: 'cover',
          tag: '주일 설교 요약',
          title: title,
          subtitle: sermonData.shorts?.[0]?.summary || '말씀 속에서 발견하는 하나님의 은혜와 진리',
          passage: passage,
          speaker: preacher,
          church: church,
        }
      ];

      for (let i = 0; i < 5; i++) {
        const sh = sermonData.shorts?.[i];
        const med = sermonData.meditations?.[i];
        const pointTitle = sh?.title_answer || med?.theme || `믿음의 핵심 원리 0${i + 1}`;
        const pointBody = sh?.summary || (med?.content ? med.content.slice(0, 140) : '하나님을 바라보고 믿음의 자리를 굳게 지키십시오.');

        cards.push({
          id: i + 2,
          type: 'content',
          tag: `Point 0${i + 1}`,
          title: pointTitle,
          body: pointBody,
        });
      }

      cards.push({
        id: 7,
        type: 'closing',
        tag: '결단과 기도',
        title: '오늘의 믿음 결단',
        body: `"${title} 말씀을 마음에 새기고,\n세상 속에서 빛과 소금의 삶을 살아가게 하옵소서.\n예수 그리스도의 이름으로 기도드립니다. 아멘."`,
        church: church,
      });

      return cards;
    } else {
      const dayIdx = parseInt(selectedDailyDay, 10) - 1;
      const dayNames = ['월', '화', '수', '목', '금'];
      const currentDayName = dayNames[dayIdx] || '월';
      const med = sermonData.meditations?.[dayIdx];

      const theme = med?.theme || `${title} - Day ${selectedDailyDay} 묵상`;
      const verse = med?.bibleVerse ? med.bibleVerse.split('\n')[0] : passage;
      const content = med?.content || '오늘 주신 말씀을 깊이 묵상하며 주님의 음성에 귀 기울입니다.';
      const question = med?.question || '오늘 나에게 주신 말씀은 무엇입니까?';
      const application = med?.application || '말씀을 기억하며 오늘 하루 믿음으로 순종하기.';
      const prayer = med?.closingPrayer || '주님과 동행하는 복된 하루가 되게 하옵소서. 아멘.';

      return [
        {
          id: 1,
          type: 'cover',
          tag: `Day ${selectedDailyDay} (${currentDayName})`,
          title: theme,
          passage: verse,
          church: church,
        },
        {
          id: 2,
          type: 'content',
          tag: '말씀 묵상',
          title: '말씀과 은혜',
          body: content.slice(0, 180) + (content.length > 180 ? '...' : ''),
        },
        {
          id: 3,
          type: 'content',
          tag: '삶의 적용',
          title: '일상의 실천',
          body: `질문: ${question}\n\n적용: ${application}`,
        },
        {
          id: 4,
          type: 'closing',
          tag: '마치는 기도',
          title: `${currentDayName}요일의 기도`,
          body: prayer,
          church: church,
        },
      ];
    }
  };

  const rawSlides = isFullSermon
    ? sermonData.sermonCardNews
    : sermonData.dailyCardNewsSets?.[selectedDailyDay];

  const slides = (rawSlides && Array.isArray(rawSlides) && rawSlides.length > 0)
    ? rawSlides
    : getFallbackSlides();

  const currentSlide = slides[currentIndex] || slides[0] || {};

  const handleUpdateSlide = (slideIndex, updatedSlide) => {
    if (isFullSermon) {
      const newSermonCards = [...slides];
      newSermonCards[slideIndex] = updatedSlide;
      setSermonData({ ...sermonData, sermonCardNews: newSermonCards });
    } else {
      const newDailySets = { ...(sermonData.dailyCardNewsSets || {}) };
      const currentDaySet = [...slides];
      currentDaySet[slideIndex] = updatedSlide;
      newDailySets[selectedDailyDay] = currentDaySet;
      setSermonData({ ...sermonData, dailyCardNewsSets: newDailySets });
    }
  };

  const handleSubTabChange = (tab) => {
    setSubTab(tab);
    setCurrentIndex(0);
  };

  const handleDayChange = (day) => {
    setSelectedDailyDay(day);
    setCurrentIndex(0);
  };

  return (
    <div className="space-y-5">
      
      {/* 서브탭 헤더 */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#EFECE3] rounded-xl w-full sm:w-auto">
          <button
            onClick={() => handleSubTabChange('full_sermon')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isFullSermon
                ? 'bg-white text-[#282622] shadow-xs'
                : 'text-[#66635E] hover:text-[#282622]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>설교카드 (7장)</span>
          </button>

          <button
            onClick={() => handleSubTabChange('daily')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isFullSermon
                ? 'bg-white text-[#282622] shadow-xs'
                : 'text-[#66635E] hover:text-[#282622]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>5day 묵상카드 (월~금)</span>
          </button>
        </div>

        {/* 설교카드 생성 버튼 */}
        <button
          onClick={handleGenerateCards}
          disabled={isGenerating}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
            isGenerated
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-[#DA7756] hover:bg-[#C56545] text-white'
          } disabled:opacity-60`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>설교카드 생성 중...</span>
            </>
          ) : isGenerated ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>설교카드 재생성</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>설교카드 생성하기</span>
            </>
          )}
        </button>
      </div>

      {/* 카드 미생성 안내 */}
      {!isGenerated && !isGenerating && (
        <div className="bg-[#FAF9F5] border border-dashed border-[#DA7756]/50 rounded-2xl p-8 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-[#DA7756]/60 mx-auto" />
          <div>
            <p className="text-sm font-bold text-[#282622]">설교카드 & 묵상카드를 생성해보세요</p>
            <p className="text-xs text-[#807D77] mt-1">
              위의 <strong className="text-[#DA7756]">설교카드 생성하기</strong> 버튼을 누르면<br />
              설교카드 7장 & 5일치 묵상카드가 만들어집니다.
            </p>
          </div>
        </div>
      )}

      {/* 요일 탭 (daily일 때만 표시) */}
      {isGenerated && !isFullSermon && (
        <div className="bg-white rounded-2xl p-3 border border-[#EAE8E1] flex items-center gap-1 overflow-x-auto">
          {['1', '2', '3', '4', '5'].map((day) => {
            const dayNames = { '1': '월', '2': '화', '3': '수', '4': '목', '5': '금' };
            const isActive = selectedDailyDay === day;
            return (
              <button
                key={day}
                onClick={() => handleDayChange(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  isActive ? 'bg-[#282622] text-white' : 'bg-[#FAF9F5] text-[#66635E] border border-[#EAE8E1]'
                }`}
              >
                Day {day} ({dayNames[day]})
              </button>
            );
          })}
        </div>
      )}

      {/* 슬라이드 에디터 (생성 후에만 표시) */}
      {isGenerated && (
        <>
          {/* 스타일 컨트롤바 */}
          <EditorControls
            bgTheme={bgTheme}
            setBgTheme={setBgTheme}
            customBgUrl={customBgUrl}
            setCustomBgUrl={setCustomBgUrl}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            fontSize={fontSize}
            setFontSize={setFontSize}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            churchName={churchName}
            setChurchName={setChurchName}
          />

          {/* 슬라이드 캔버스 프리뷰 */}
          <SlideCanvas
            slide={currentSlide}
            index={currentIndex}
            total={slides.length}
            bgTheme={bgTheme}
            customBgUrl={customBgUrl}
            fontFamily={fontFamily}
            fontSize={fontSize}
            aspectRatio={aspectRatio}
            churchName={churchName}
            onUpdateSlide={handleUpdateSlide}
            canvasRef={canvasRef}
          />

          {/* 네비게이터 & 다운로드 */}
          <SlideNavigator
            slides={slides}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            canvasRef={canvasRef}
            title={isFullSermon ? 'sermon-full' : `sermon-day${selectedDailyDay}`}
          />
        </>
      )}
    </div>
  );
}
