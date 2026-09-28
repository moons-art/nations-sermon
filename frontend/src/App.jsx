import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import UploadTab from './components/upload/UploadTab';
import ShortsTab from './components/shorts/ShortsTab';
import ShortsListView from './components/shorts/ShortsListView';
import CardNewsTab from './components/cardnews/CardNewsTab';
import CardListView from './components/cardnews/CardListView';
import { DEFAULT_SERMON_ANALYSIS } from './utils/mockData';
import { fetchRenderJobs } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'shorts' | 'shorts_list' | 'cardnews' | 'card_list'
  const [sermonData, setSermonData] = useState(DEFAULT_SERMON_ANALYSIS);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  // 카드 에디터 네비게이션용 상태
  const [cardTargetSubTab, setCardTargetSubTab] = useState('full_sermon');
  const [cardTargetDay, setCardTargetDay] = useState('1');

  // 사이드바 상태 알림 점: 'processing' (주황점) | 'done' (파란점) | null
  const [shortsNotice, setShortsNotice] = useState('done'); // 초기 완료 샘플 표시용
  const [cardNotice, setCardNotice] = useState('done');     // 초기 완료 샘플 표시용

  // 렌더링 큐 상태 주기적 모니터링하여 알림 점 업데이트
  useEffect(() => {
    const checkJobs = async () => {
      const res = await fetchRenderJobs();
      if (res && res.jobs) {
        const hasProcessing = res.jobs.some((j) => j.status === 'PROCESSING' || j.status === 'QUEUED');
        if (hasProcessing) {
          setShortsNotice('processing');
        } else if (shortsNotice === 'processing') {
          // 방금 끝났을 때 파란 점으로 전환
          setShortsNotice('done');
        }
      }
    };

    const interval = setInterval(checkJobs, 3000);
    return () => clearInterval(interval);
  }, [shortsNotice]);

  const handleShortsQueued = () => {
    setShortsNotice('processing');
  };

  const handleSelectCardSet = (subTab, day) => {
    setCardTargetSubTab(subTab);
    if (day) setCardTargetDay(day);
    setActiveTab('cardnews');
  };

  const tabTitles = {
    upload: '나의 설교 업로드',
    shorts: '쇼츠 생성',
    shorts_list: '쇼츠 목록',
    cardnews: '설교카드 (5day 묵상카드 / 설교카드)',
    card_list: '카드설교 목록',
  };

  return (
    <div className="flex h-screen bg-[#FBFBF9] text-[#282622] font-sans antialiased selection:bg-[#DA7756]/20 selection:text-[#DA7756] overflow-hidden">
      {/* 1. 좌측 호버 반응형 사이드바 */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiKey={apiKey}
        setApiKey={setApiKey}
        currentSermonTitle={sermonData?.metadata?.title}
        shortsNotice={shortsNotice}
        cardNotice={cardNotice}
      />

      {/* 2. 우측 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 상단 미니멀 헤더 */}
        <header className="h-14 border-b border-[#EAE8E1] px-6 sm:px-8 flex items-center justify-between bg-[#FBFBF9]/90 backdrop-blur-xs flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold text-[#282622] font-mono tracking-tight uppercase">
              {tabTitles[activeTab]}
            </h1>
            {sermonData?.metadata?.title && (
              <span className="text-[11px] text-[#807D77] font-medium hidden sm:inline truncate max-w-md font-serif-kr">
                &bull; {sermonData.metadata.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#807D77] font-mono">
            <span className="hidden sm:inline">Nations Sermon Studio</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#DA7756]"></span>
          </div>
        </header>

        {/* 메인 뷰 스크롤 컨테이너 */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {/* 1. 나의 설교 업로드 */}
          {activeTab === 'upload' && (
            <UploadTab
              sermonData={sermonData}
              setSermonData={(data) => {
                setSermonData(data);
                setCardNotice('done'); // 새 설교 분석 완료 시 카드 목록에 파란 점
              }}
              setYoutubeUrl={setYoutubeUrl}
              setActiveTab={setActiveTab}
              apiKey={apiKey}
            />
          )}

          {/* 2. 쇼츠 생성 */}
          {activeTab === 'shorts' && (
            <ShortsTab
              sermonData={sermonData}
              setSermonData={setSermonData}
              youtubeUrl={youtubeUrl}
              onShortsQueued={handleShortsQueued}
              onNavigateToShortsList={() => setActiveTab('shorts_list')}
            />
          )}

          {/* 3. 쇼츠 목록 (열어보면 파란색 알림 점 소거) */}
          {activeTab === 'shorts_list' && (
            <ShortsListView
              sermonData={sermonData}
              onView={() => {
                if (shortsNotice === 'done') setShortsNotice(null);
              }}
            />
          )}

          {/* 4. 설교카드 (5day 묵상카드 & 설교카드) */}
          {activeTab === 'cardnews' && (
            <CardNewsTab
              sermonData={sermonData}
              setSermonData={setSermonData}
              targetSubTab={cardTargetSubTab}
              targetDay={cardTargetDay}
            />
          )}

          {/* 5. 카드설교 목록 (열어보면 파란색 알림 점 소거) */}
          {activeTab === 'card_list' && (
            <CardListView
              sermonData={sermonData}
              onSelectCardSet={handleSelectCardSet}
              onView={() => {
                if (cardNotice === 'done') setCardNotice(null);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
