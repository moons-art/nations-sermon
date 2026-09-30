import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import UploadTab from './components/upload/UploadTab';
import ShortsTab from './components/shorts/ShortsTab';
import ShortsListView from './components/shorts/ShortsListView';
import CardNewsTab from './components/cardnews/CardNewsTab';
import CardListView from './components/cardnews/CardListView';
import { DEFAULT_SERMON_ANALYSIS, SermonAnalysisData } from './utils/mockData';
import { fetchRenderJobs, startAsyncAnalyze, getAnalyzeStatus } from './api/client';
import { Loader2, Sparkles, CheckCircle, ArrowRight, X, Clock } from 'lucide-react';

export interface GlobalAnalysisState {
  isAnalyzing: boolean;
  taskId: string | null;
  url: string;
  startTime: number;
  elapsed: number;
  stage: string;
  progress: number;
}

const STORAGE_DATA_KEY = 'seolgyo_sermon_data';
const STORAGE_TASK_KEY = 'seolgyo_active_task';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'shorts' | 'shorts_list' | 'cardnews' | 'card_list'>('upload');
  
  // Persist sermon data in state and localStorage
  const [sermonData, setSermonData] = useState<SermonAnalysisData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DATA_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_SERMON_ANALYSIS;
  });

  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Global analysis task state across all pages
  const [analysisState, setAnalysisState] = useState<GlobalAnalysisState>(() => {
    try {
      const savedTask = localStorage.getItem(STORAGE_TASK_KEY);
      if (savedTask) {
        const parsed = JSON.parse(savedTask);
        if (parsed.isAnalyzing) {
          const now = Date.now();
          const elapsed = Math.floor((now - (parsed.startTime || now)) / 1000);
          return { ...parsed, elapsed };
        }
      }
    } catch (e) {
      // fallback
    }
    return {
      isAnalyzing: false,
      taskId: null,
      url: '',
      startTime: 0,
      elapsed: 0,
      stage: '대기 중',
      progress: 0,
    };
  });

  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  // 카드 에디터 네비게이션용 상태
  const [cardTargetSubTab, setCardTargetSubTab] = useState<'full_sermon' | 'daily'>('full_sermon');
  const [cardTargetDay, setCardTargetDay] = useState('1');

  // 사이드바 상태 알림 점: 'processing' (주황점) | 'done' (파란점) | null
  const [shortsNotice, setShortsNotice] = useState<'processing' | 'done' | null>('done');
  const [cardNotice, setCardNotice] = useState<'processing' | 'done' | null>('done');

  // Sync sermonData to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(sermonData));
    } catch (e) {
      // ignore
    }
  }, [sermonData]);

  // Sync analysisState to localStorage
  useEffect(() => {
    try {
      if (analysisState.isAnalyzing) {
        localStorage.setItem(STORAGE_TASK_KEY, JSON.stringify(analysisState));
      } else {
        localStorage.removeItem(STORAGE_TASK_KEY);
      }
    } catch (e) {
      // ignore
    }
  }, [analysisState]);

  // Polling loop for active analysis task (runs globally in App even if tab changes)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!analysisState.isAnalyzing || !analysisState.taskId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const taskId = analysisState.taskId;

    // Elapsed timer
    const elapsedInterval = setInterval(() => {
      setAnalysisState((prev) => {
        if (!prev.isAnalyzing) return prev;
        const now = Date.now();
        const elapsed = Math.max(0, Math.floor((now - (prev.startTime || now)) / 1000));
        return { ...prev, elapsed };
      });
    }, 1000);

    // Backend status polling
    const pollStatus = async () => {
      try {
        const res = await getAnalyzeStatus(taskId);
        if (res && res.task) {
          const task = res.task;

          if (task.status === 'PROCESSING') {
            setAnalysisState((prev) => ({
              ...prev,
              progress: task.progress || prev.progress,
              stage: task.stage || prev.stage,
            }));
          } else if (task.status === 'COMPLETED') {
            clearInterval(elapsedInterval);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);

            if (task.data) {
              setSermonData(task.data);
            }

            setAnalysisState({
              isAnalyzing: false,
              taskId: null,
              url: task.youtube_url,
              startTime: 0,
              elapsed: 0,
              stage: '완료',
              progress: 100,
            });

            setShortsNotice('done');
            setCardNotice('done');
            setShowCompletionBanner(true);
          } else if (task.status === 'FAILED') {
            clearInterval(elapsedInterval);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setAnalysisState((prev) => ({
              ...prev,
              isAnalyzing: false,
              stage: '분석 중 오류 발생',
            }));
            alert(`설교 분석 실패: ${task.error || '알 수 없는 오류'}`);
          }
        }
      } catch (err) {
        console.warn('Poll error, will retry:', err);
      }
    };

    pollTimerRef.current = setInterval(pollStatus, 1500);

    return () => {
      clearInterval(elapsedInterval);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [analysisState.isAnalyzing, analysisState.taskId]);

  // Global Start Analysis trigger
  const handleStartAnalysis = async (url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setYoutubeUrl(trimmedUrl);
    setShowCompletionBanner(false);

    try {
      const res = await startAsyncAnalyze(trimmedUrl);
      const taskId = res.task_id;

      setAnalysisState({
        isAnalyzing: true,
        taskId: taskId,
        url: trimmedUrl,
        startTime: Date.now(),
        elapsed: 0,
        stage: '1단계: 유튜브 영상 정보 및 설교 메타데이터 확인 중...',
        progress: 15,
      });
    } catch (err: any) {
      console.error('Failed to start async analysis:', err);
      alert(`분석 작업 시작 실패: ${err.message || '서버 오류'}`);
    }
  };

  // Check render jobs periodically
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

  const handleShortsQueued = () => {
    setShortsNotice('processing');
  };

  const handleSelectCardSet = (subTab: 'full_sermon' | 'daily', day: string | null) => {
    setCardTargetSubTab(subTab);
    if (day) setCardTargetDay(day);
    setActiveTab('cardnews');
  };

  const tabTitles: Record<string, string> = {
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
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
        currentSermonTitle={sermonData?.metadata?.title}
        shortsNotice={analysisState.isAnalyzing ? 'processing' : shortsNotice}
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
            {analysisState.isAnalyzing ? (
              <div className="flex items-center gap-1.5 text-[#DA7756] font-semibold bg-[#FAF9F5] border border-[#DA7756]/30 px-2.5 py-1 rounded-full animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>백그라운드 분석 중 ({analysisState.elapsed}초)</span>
              </div>
            ) : (
              <>
                <span className="hidden sm:inline">Nations Sermon AI Studio</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#DA7756]"></span>
              </>
            )}
          </div>
        </header>

        {/* 🌟 전역 영구 진행 바 (어느 탭으로 이동해도 상단에 계속 표시됨) */}
        {analysisState.isAnalyzing && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 sm:px-8 py-3 flex-shrink-0 animate-fadeIn z-20">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 text-xs text-amber-950 font-medium">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <span>AI 설교 정밀 분석 작업 진행 중</span>
                    <span className="font-mono text-[11px] px-2 py-0.2 bg-amber-200/80 rounded-full text-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {analysisState.elapsed}초 경과
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {analysisState.stage}
                  </p>
                </div>
              </div>

              {/* 진행도 게이지 */}
              <div className="w-full sm:w-48 flex items-center gap-2">
                <div className="flex-1 bg-amber-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        analysisState.elapsed <= 15
                          ? Math.min(85, Math.max(12, (analysisState.elapsed / 15) * 85))
                          : Math.min(96, 85 + ((analysisState.elapsed - 15) / 10) * 11)
                      }%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-amber-900 font-bold">
                  {Math.min(96, Math.max(12, Math.floor(analysisState.elapsed * 4)))}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 분석 완료 알림 배너 */}
        {showCompletionBanner && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 sm:px-8 py-3 flex-shrink-0 animate-fadeIn z-20">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-emerald-950 font-bold">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>설교 본문 분석이 완료되었습니다.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('shorts');
                    setShowCompletionBanner(false);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>쇼츠 생성으로 이동</span>
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompletionBanner(false)}
                  className="p-1 text-emerald-800 hover:text-emerald-950"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 메인 뷰 스크롤 컨테이너 */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {/* 1. 나의 설교 업로드 */}
          {activeTab === 'upload' && (
            <UploadTab
              sermonData={sermonData}
              setSermonData={(data) => {
                setSermonData(data);
                setCardNotice('done');
                setShortsNotice('done');
              }}
              setYoutubeUrl={setYoutubeUrl}
              setActiveTab={(tab) => setActiveTab(tab as any)}
              globalAnalysisState={analysisState}
              onStartAnalysis={handleStartAnalysis}
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

          {/* 3. 쇼츠 목록 */}
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

          {/* 5. 카드설교 목록 */}
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
