import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import UploadTab from './components/upload/UploadTab';
import SermonTextView from './components/upload/SermonTextView';
import ShortsTab from './components/shorts/ShortsTab';
import ShortsListView from './components/shorts/ShortsListView';
import CardNewsTab from './components/cardnews/CardNewsTab';
import CardListView from './components/cardnews/CardListView';
import AdminDashboard from './components/AdminDashboard';
import { fetchRenderJobs } from './api/client';
import AuthModal from './components/AuthModal';
import PricingPage from './components/PricingPage';
import { useAuth } from './api/AuthContext';
import { LogIn, LogOut, Crown, User, Menu, PanelLeft } from 'lucide-react';
const BASE_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');

export default function App() {
  const { currentUser, userLoading, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // 사이드바 오버레이 열림/닫힘 상태 (기본 완전히 숨김)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 'upload' | 'sermon_view' | 'shorts' | 'shorts_list' | 'cardnews' | 'card_list'
  const [activeTab, setActiveTab] = useState('upload');
  
  // ─── [비용 절감 영구 보관]: LocalStorage에서 마지막 설교 데이터 로드 ───
  const [sermonData, setSermonData] = useState(() => {
    try {
      const saved = localStorage.getItem('last_sermon_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [youtubeUrl, setYoutubeUrl] = useState(() => {
    return localStorage.getItem('last_youtube_url') || '';
  });

  // ─── [비용 절감 설교 보관함]: 최근 분석된 설교 목록 영구 저장 ───
  const [sermonHistory, setSermonHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('sermon_history_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (sermonData) {
      try {
        localStorage.setItem('last_sermon_data', JSON.stringify(sermonData));
      } catch (e) {}
    }
    if (youtubeUrl) {
      localStorage.setItem('last_youtube_url', youtubeUrl);
    }
  }, [sermonData, youtubeUrl]);

  // 설교 보관함에 새 분석 데이터 추가
  const addSermonToHistory = (data, url) => {
    if (!data || !data.metadata) return;
    setSermonHistory(prev => {
      const filtered = prev.filter(item => item.url !== url && item.title !== data.metadata?.title);
      const updated = [
        {
          id: Date.now(),
          url: url || '',
          title: data.metadata?.title || '설교 영상',
          church: data.metadata?.churchName || '',
          preacher: data.metadata?.preacher || '',
          thumbnail: data.metadata?.thumbnail || '',
          date: new Date().toLocaleDateString('ko-KR'),
          shortsCount: data.shorts?.length || 0,
          data: data,
          isNew: true, // 신규 분석 배지
        },
        ...filtered.map(item => ({ ...item, isNew: false }))
      ].slice(0, 30);
      try {
        localStorage.setItem('sermon_history_list', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleDeleteHistory = (id) => {
    setSermonHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem('sermon_history_list', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleSelectHistory = (item) => {
    if (!item?.data) return;
    setSermonData(item.data);
    setYoutubeUrl(item.url || '');
    setActiveTab('sermon_view');
  };

  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [apiKey]);

  // 카드 에디터 네비게이션용 상태
  const [cardTargetSubTab, setCardTargetSubTab] = useState('full_sermon');
  const [cardTargetDay, setCardTargetDay] = useState('1');

  // ─── 전역 분석 상태 (새로고침/탭 이동 시에도 유지되도록 localStorage 연동) ───
  const [analysisState, setAnalysisState] = useState(() => {
    try {
      const saved = localStorage.getItem('current_analysis_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isAnalyzing && parsed.taskId) {
          return parsed;
        }
      }
    } catch (e) {}
    return {
      isAnalyzing: false,
      taskId: null,
      progress: 0,
      stage: '',
      elapsed: 0,
      error: null,
    };
  });

  const analysisTimerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // 분석 상태 변경 시 localStorage 동기화
  useEffect(() => {
    try {
      if (analysisState.isAnalyzing && analysisState.taskId) {
        localStorage.setItem('current_analysis_state', JSON.stringify(analysisState));
      } else {
        localStorage.removeItem('current_analysis_state');
      }
    } catch (e) {}
  }, [analysisState.isAnalyzing, analysisState.taskId, analysisState.progress, analysisState.stage]);

  // 분석 경과 시간 타이머
  useEffect(() => {
    if (analysisState.isAnalyzing) {
      analysisTimerRef.current = setInterval(() => {
        setAnalysisState(prev => ({ ...prev, elapsed: prev.elapsed + 1 }));
      }, 1000);
    } else {
      clearInterval(analysisTimerRef.current);
    }
    return () => clearInterval(analysisTimerRef.current);
  }, [analysisState.isAnalyzing]);

  // 분석 폴링 (백그라운드에서 계속 동작)
  useEffect(() => {
    if (analysisState.taskId && analysisState.isAnalyzing) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/analyze/status/${analysisState.taskId}`);
          if (!res.ok) return;
          const json = await res.json();
          const task = json.task;

          setAnalysisState(prev => ({
            ...prev,
            progress: task.progress || prev.progress,
            stage: task.stage || prev.stage,
          }));

          if (task.status === 'COMPLETED') {
            clearInterval(pollIntervalRef.current);
            setSermonData(task.data);
            addSermonToHistory(task.data, task.youtube_url || youtubeUrl);
            setCardNotice('done');
            setAnalysisState({
              isAnalyzing: false,
              taskId: null,
              progress: 100,
              stage: '분석이 완료되어 설교분석 기록에 저장되었습니다.',
              elapsed: 0,
              error: null,
            });
            // 분석 완료 시 알림 표시 후 설교 분석 결과 탭으로 이동
            setActiveTab('sermon_view');
          } else if (task.status === 'FAILED') {
            clearInterval(pollIntervalRef.current);
            setAnalysisState({
              isAnalyzing: false,
              taskId: null,
              progress: 0,
              stage: '',
              elapsed: 0,
              error: task.error || '분석 실패',
            });
          }
        } catch (e) {
          console.error('폴링 오류:', e);
        }
      }, 2000);
    }
    return () => clearInterval(pollIntervalRef.current);
  }, [analysisState.taskId, analysisState.isAnalyzing]);

  // 사이드바 상태 알림 점: 'processing' (주황점) | 'done' (파란점) | null
  const [shortsNotice, setShortsNotice] = useState('done');
  const [cardNotice, setCardNotice] = useState('done');

  // 렌더링 큐 상태 주기적 모니터링
  useEffect(() => {
    const checkJobs = async () => {
      const res = await fetchRenderJobs();
      if (res && res.jobs) {
        const hasProcessing = res.jobs.some((j) => j.status === 'PROCESSING' || j.status === 'QUEUED');
        if (hasProcessing) {
          setShortsNotice('processing');
        } else if (shortsNotice === 'processing') {
          setShortsNotice('done');
        }
      }
    };

    const interval = setInterval(checkJobs, 3000);
    return () => clearInterval(interval);
  }, [shortsNotice]);

  // 분석 수동 중단 함수
  const cancelAnalysis = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    try {
      localStorage.removeItem('current_analysis_state');
    } catch (e) {}
    setAnalysisState({
      isAnalyzing: false,
      taskId: null,
      progress: 0,
      stage: '',
      elapsed: 0,
      error: '사용자에 의해 분석이 중단되었습니다.',
    });
  };

  // 유튜브 비동기 분석 시작 함수
  const startAnalysis = async (ytUrl, geminiApiKey) => {
    setYoutubeUrl(ytUrl);
    setAnalysisState({
      isAnalyzing: true,
      taskId: null,
      progress: 5,
      stage: '분석 작업을 시작하고 있습니다...',
      elapsed: 0,
      error: null,
    });

    try {
      const res = await fetch(`${BASE_URL}/api/analyze/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: ytUrl, gemini_api_key: geminiApiKey || '' }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || '분석 시작 실패');
      }
      const json = await res.json();
      if (json.is_cached) {
        // 이미 분석된 캐시 영상인 경우: 튕기지 않고 안내 문구를 띄우고 결과로 부드럽게 전환
        setAnalysisState({
          isAnalyzing: false,
          taskId: null,
          progress: 100,
          stage: '',
          elapsed: 0,
          error: null,
          cachedNotice: json.message || "이미 분석이 완료된 영상입니다. 하단의 '최근 분석된 설교 보관함'을 확인해주세요.",
        });
        return;
      }

      setAnalysisState(prev => ({
        ...prev,
        taskId: json.task_id,
        stage: '분석 작업이 시작되었습니다. 다른 탭을 이용하셔도 됩니다.',
        cachedNotice: null,
      }));
    } catch (err) {
      setAnalysisState({
        isAnalyzing: false,
        taskId: null,
        progress: 0,
        stage: '',
        elapsed: 0,
        error: err.message,
        cachedNotice: null,
      });
    }
  };

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
    sermon_view: '설교 분석 결과 (제목 · 본문 · 설교문)',
    shorts: '쇼츠 생성',
    shorts_list: '쇼츠 목록',
    cardnews: '설교카드 (5day 묵상카드 / 설교카드)',
    card_list: '카드설교 목록',
    admin_dashboard: '네이션스 총괄 관리자 대시보드',
  };

  return (
    <div className="flex h-screen bg-[#FBFBF9] text-[#282622] font-sans antialiased selection:bg-[#DA7756]/20 selection:text-[#DA7756] overflow-hidden relative">
      {/* 1. 화면을 덮는 슬라이드 오버레이 사이드바 (네이션스 바이블 스타일) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSermonTitle={sermonData?.metadata?.title}
        shortsNotice={shortsNotice}
        cardNotice={cardNotice}
        analysisState={analysisState}
        currentUser={currentUser}
        userLoading={userLoading}
        onOpenLogin={() => setShowAuthModal(true)}
        onOpenPricing={() => setShowPricing(true)}
        onLogout={logout}
      />

      {/* 2. 전체 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* 상단 미니멀 헤더 (우측 요금제/로그인 요소는 사이드바로 이전하여 한결 깔끔해짐) */}
        <header className="h-14 border-b border-[#EAE8E1] px-4 sm:px-8 flex items-center justify-between bg-[#FBFBF9]/90 backdrop-blur-xs flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* 최상단 사이드바 토글 버튼 (네이션스 바이블 특유의 분할 패널 아이콘 1:1 일치) */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              onMouseEnter={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-[#5E5B55] hover:text-[#1C1A18] hover:bg-[#EFECE6] transition-colors flex items-center gap-2 cursor-pointer"
              title="사이드바 메뉴 토글"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#4A4742]">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>

            {/* 네이션스 바이블 스타일 상단 타이틀 (✦ AI 설교 / 탭 제목) */}
            <div className="flex items-center gap-2 ml-1">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#5E5B55]">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
              <h1 className="text-[13.5px] font-bold text-[#282622] tracking-tight">
                {tabTitles[activeTab]}
              </h1>
              {sermonData?.metadata?.title && (
                <span className="text-[11.5px] text-[#807D77] font-medium hidden md:inline truncate max-w-md font-serif-kr">
                  &bull; {sermonData.metadata.title}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#807D77] font-mono">
            {/* 전역 분석 진행 상태 표시 */}
            {analysisState.isAnalyzing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 animate-fadeIn">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-semibold">
                  AI 설교 분석 중... ({analysisState.elapsed}초)
                </span>
                <span className="text-[10px] opacity-70">{analysisState.progress}%</span>
              </div>
            )}
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
                addSermonToHistory(data, youtubeUrl);
                setCardNotice('done');
              }}
              setYoutubeUrl={setYoutubeUrl}
              setActiveTab={setActiveTab}
              apiKey={apiKey}
              analysisState={analysisState}
              onStartAnalysis={startAnalysis}
              onCancelAnalysis={cancelAnalysis}
              sermonHistory={sermonHistory}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
            />
          )}

          {/* 2. 설교 분석 결과 */}
          {activeTab === 'sermon_view' && (
            <SermonTextView
              sermonData={sermonData}
              onNavigateToShorts={() => setActiveTab('shorts')}
              onNavigateToCards={() => setActiveTab('cardnews')}
              onNavigateToUpload={() => setActiveTab('upload')}
              sermonHistory={sermonHistory}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
            />
          )}

          {/* 3. 쇼츠 생성 */}
          {activeTab === 'shorts' && (
            <ShortsTab
              sermonData={sermonData || {}}
              setSermonData={setSermonData}
              youtubeUrl={youtubeUrl}
              onShortsQueued={handleShortsQueued}
              onNavigateToShortsList={() => setActiveTab('shorts_list')}
            />
          )}

          {/* 3. 쇼츠 목록 */}
          {activeTab === 'shorts_list' && (
            <ShortsListView
              sermonData={sermonData}
              youtubeUrl={youtubeUrl}
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
              apiKey={apiKey}
            />
          )}

          {/* 5. 카드설교 목록 */}
          {activeTab === 'card_list' && (
            <CardListView
              sermonData={sermonData}
              setSermonData={setSermonData}
              onSelectCardSet={handleSelectCardSet}
              onView={() => {
                if (cardNotice === 'done') setCardNotice(null);
              }}
            />
          )}

          {/* 6. 관리자 전용 대시보드 (ymoonsik 계정 로그인 시 이용) */}
          {activeTab === 'admin_dashboard' && (
            <AdminDashboard currentUser={currentUser} />
          )}
        </main>
      </div>

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />

      {/* 요금제 모달 */}
      {showPricing && (
        <PricingPage isModal={true} onClose={() => setShowPricing(false)} />
      )}
    </div>
  );
}
