import React, { useState, useEffect } from 'react';
import {
  FileText,
  Wand2,
  Sparkles,
  ArrowRight,
  Loader2,
  Copy,
  Check,
  Plus,
  Trash2,
  Sliders,
  CheckCircle,
  Clock,
  Search,
} from 'lucide-react';
import YoutubeIcon from '../YoutubeIcon';
import {
  analyzeSermonUrl,
  analyzeSermonText,
  completeSermonDraft,
  refineSermonForVideo,
  trainSermonTone,
} from '../../api/client';

export default function UploadTab({
  sermonData,
  setSermonData,
  setYoutubeUrl,
  setActiveTab,
  apiKey,
  analysisState,
  onStartAnalysis,
  sermonHistory = [],
  onSelectHistory,
  onDeleteHistory,
}) {
  // 모드: 'youtube' | 'text' | 'refine'
  const [subMode, setSubMode] = useState('youtube');

  // 1. 유튜브 업로드 상태
  const [ytInput, setYtInput] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // 유튜브 분석 경과시간은 App 레벨 analysisState.elapsed 사용
  // (다른 탭 이동 후 돌아와도 경과 시간 유지)

  // 2. 텍스트 업로드 상태
  const [textTitle, setTextTitle] = useState('깊은 곳에 그물을 던지라');
  const [textContent, setTextContent] = useState('');
  const [isTextAnalyzing, setIsTextAnalyzing] = useState(false);
  const [textElapsed, setTextElapsed] = useState(0);

  useEffect(() => {
    let timer;
    if (isTextAnalyzing) {
      setTextElapsed(0);
      timer = setInterval(() => {
        setTextElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setTextElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isTextAnalyzing]);

  // 3. 설교 교정 AI 상태
  // 교정 서브탭: 'draft' (1. 미완성 완성) | 'video' (2. 영상 맞춤 교정) | 'tone' (3. 설교톤 훈련)
  const [refineType, setRefineType] = useState('draft');

  // 3-1) 미완성 설교 완성 상태
  const [ideaInput, setIdeaInput] = useState(
    '누가복음 5장 1~11절. 밤새 수고했지만 빈 그물뿐이었던 베드로. 인간의 한계와 절망. 그러나 주님의 말씀에 순종하여 깊은 곳에 그물을 내림. 찢어지게 채우심. 결국 사람 낚는 어부로 부르심. 삶에 지친 성도들에게 순종과 사명의 중요성 권면.'
  );
  const [draftResult, setDraftResult] = useState('');
  const [isDraftLoading, setIsDraftLoading] = useState(false);

  // 3-2) 영상 맞춤 교정 상태
  const [sermonToRefine, setSermonToRefine] = useState('');
  const [refinedResult, setRefinedResult] = useState('');
  const [isRefineLoading, setIsRefineLoading] = useState(false);

  // 3-3) 설교톤 훈련 상태
  const [toneSamples, setToneSamples] = useState([
    '사랑하는 성도 여러분, 살아가면서 우리가 가장 많이 놓치는 것이 무엇입니까? 바로 하나님의 신실하심입니다. 상황은 흔들려도 언약은 흔들리지 않습니다. 오늘 십자가 앞에 여러분의 무거운 짐을 내려놓으십시오.',
    '오늘 본문은 우리에게 명확한 결단을 요구합니다. 편안한 길을 택할 것인가, 아니면 좁은 문으로 걸어갈 것인가? 주님을 따르는 길에는 대가가 따르지만, 그 끝에는 영원한 생명이 기다리고 있습니다.',
  ]);
  const [toneProfile, setToneProfile] = useState(null);
  const [isToneTraining, setIsToneTraining] = useState(false);

  // 복사 피드백
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. 유튜브 분석 실행 (전역 비동기 - 다른 탭 이동해도 계속됨)
  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    if (!ytInput.trim()) return;
    if (onStartAnalysis) {
      await onStartAnalysis(ytInput, apiKey);
    }
  };

  const isYtAnalyzing = analysisState?.isAnalyzing || false;
  const ytElapsed = analysisState?.elapsed || 0;

  // 2. 텍스트 직접 분석 실행
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textContent.trim()) {
      alert('설교 텍스트를 입력해주세요.');
      return;
    }
    setIsTextAnalyzing(true);
    try {
      const data = await analyzeSermonText(textTitle, textContent, apiKey);
      setSermonData(data);
      setActiveTab('shorts');
    } catch (err) {
      console.error(err);
    } finally {
      setIsTextAnalyzing(false);
    }
  };

  // 3-1. 미완성 설교 완성 실행
  const handleCompleteDraft = async () => {
    if (!ideaInput.trim()) return;
    setIsDraftLoading(true);
    try {
      const toneInstruction = toneProfile ? toneProfile.systemInstruction : '';
      const result = await completeSermonDraft(ideaInput, toneInstruction, apiKey);
      setDraftResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDraftLoading(false);
    }
  };

  // 3-2. 영상용 은혜로운 설교체 교정 실행
  const handleRefineForVideo = async () => {
    if (!sermonToRefine.trim()) return;
    setIsRefineLoading(true);
    try {
      const result = await refineSermonForVideo(sermonToRefine, apiKey);
      setRefinedResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefineLoading(false);
    }
  };

  // 교정된 결과에서 쇼츠/카드뉴스 바로 생성 파이프라인
  const handleDirectGenerate = async (text, defaultTitle = '교정된 주일 설교') => {
    setIsTextAnalyzing(true);
    try {
      const data = await analyzeSermonText(defaultTitle, text, apiKey);
      setSermonData(data);
      setActiveTab('shorts');
    } catch (err) {
      console.error(err);
    } finally {
      setIsTextAnalyzing(false);
    }
  };

  // 텍스트 파일 (.txt) 불러오기 핸들러
  const handleFileRead = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        callback(event.target.result);
      };
      reader.readAsText(file, 'utf-8');
    }
  };
  const handleTrainTone = async () => {
    const valid = toneSamples.filter((s) => s.trim().length > 0);
    if (valid.length === 0) {
      alert('최소 1편 이상의 설교 샘플을 입력해주세요.');
      return;
    }
    setIsToneTraining(true);
    try {
      const profile = await trainSermonTone(valid, apiKey);
      setToneProfile(profile);
    } catch (err) {
      console.error(err);
    } finally {
      setIsToneTraining(false);
    }
  };

  const handleAddSample = () => {
    setToneSamples([...toneSamples, '']);
  };

  const handleRemoveSample = (index) => {
    setToneSamples(toneSamples.filter((_, idx) => idx !== index));
  };

  const handleSampleChange = (index, value) => {
    const updated = [...toneSamples];
    updated[index] = value;
    setToneSamples(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* 3대 업로드/교정 서브 모드 탭 (클로드 심플 스타일) */}
      <div className="flex items-center gap-1.5 p-1 bg-[#EFECE3] rounded-2xl w-fit border border-[#E5E3DB]">
        <button
          onClick={() => setSubMode('youtube')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subMode === 'youtube'
              ? 'bg-white text-[#282622] shadow-xs'
              : 'text-[#66635E] hover:text-[#282622]'
          }`}
        >
          <YoutubeIcon className="w-3.5 h-3.5 text-red-600" />
          <span>유튜브 설교 올리기</span>
        </button>

        <button
          onClick={() => setSubMode('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subMode === 'text'
              ? 'bg-white text-[#282622] shadow-xs'
              : 'text-[#66635E] hover:text-[#282622]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-[#807D77]" />
          <span>설교 텍스트 올리기</span>
        </button>

        <button
          onClick={() => setSubMode('refine')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subMode === 'refine'
              ? 'bg-white text-[#282622] shadow-xs'
              : 'text-[#66635E] hover:text-[#282622]'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 text-[#DA7756]" />
          <span>설교 교정 AI</span>
          {toneProfile && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#DA7756]"></span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────
          MODE 1: 유튜브 설교 올리기 & 분석
      ───────────────────────────────────────────── */}
      {subMode === 'youtube' && (
        <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#282622]">유튜브 설교 링크 입력</h2>
            <p className="text-xs text-[#807D77] mt-0.5">
              설교 영상 URL을 넣으시면 실제 자막을 추출하여 AI가 쇼츠 5개, 5일 묵상집, 카드뉴스를 생성합니다.
            </p>
          </div>

          {/* Gemini API 키 미입력 경고 */}
          {!apiKey && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-800">Gemini API 키가 필요합니다</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  좌측 사이드바 하단의 <strong>🔑 API Key</strong> 버튼을 눌러 Gemini API 키를 입력하세요.<br />
                  키 없이는 자막 추출만 되고 AI 분석이 실행되지 않습니다.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleYoutubeSubmit} className="space-y-3">
            <div className="flex items-center gap-2.5 p-2 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl focus-within:border-[#DA7756] transition-colors">
              <YoutubeIcon className="w-5 h-5 text-red-600 flex-shrink-0 ml-1" />
              <input
                type="text"
                value={ytInput}
                onChange={(e) => setYtInput(e.target.value)}
                placeholder="분석할 유튜브 설교 영상 URL을 입력하세요 (예: https://www.youtube.com/watch?v=...)"
                className="w-full bg-transparent text-xs text-[#282622] placeholder-[#A5A29B] focus:outline-none"
              />
            </div>

            {/* 실시간 진행 상태 박스 */}
            {isYtAnalyzing && (
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between font-semibold text-amber-950">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" />
                    <span>목사님의 설교영상을 정밀 분석하고 있습니다</span>
                  </div>
                  <span className="font-mono text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ytElapsed}초 경과 / 약 30초~60초 소요
                  </span>
                </div>

                {/* 프로그레스 바 */}
                <div className="w-full bg-amber-200/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        ytElapsed <= 40
                          ? Math.min(88, Math.max(8, (ytElapsed / 40) * 88))
                          : Math.min(96, 88 + ((ytElapsed - 40) / 20) * 8)
                      }%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-amber-900">
                  <span className="font-medium animate-pulse">분석중..</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={isYtAnalyzing || !ytInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                {isYtAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>분석 중 ({ytElapsed}초)...</span>
                  </>
                ) : (
                  <>
                    <span>분석 및 콘텐츠 생성</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 이미 분석된 영상 안내 메시지 */}
          {analysisState?.cachedNotice && !isYtAnalyzing && (
            <div className="mt-3 p-3.5 bg-[#FAF9F5] border border-[#DA7756]/40 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
              <p className="text-xs text-[#282622]">
                분석 기록이 있는 영상입니다. <strong>[설교 분석 결과]</strong> 페이지에서 바로 확인하실 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('sermon_view')}
                className="px-3 py-1.5 rounded-lg bg-[#DA7756] hover:bg-[#C56545] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                결과 확인하기 &rarr;
              </button>
            </div>
          )}

          {/* 분석 완료 상태 안내 문구 및 바로가기 */}
          {analysisState?.stage && !isYtAnalyzing && !analysisState?.error && (
            <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-semibold text-emerald-800">
                  {analysisState.stage} 설교분석결과 페이지에서 상세 내용을 확인하세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('sermon_view')}
                className="px-3 py-1.5 rounded-lg bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                설교분석결과 보기 &rarr;
              </button>
            </div>
          )}

          {/* 분석 실패 오류 메시지: 복잡한 원본 에러를 모두 비우고 '다시 시도해 주세요'만 깔끔하게 노출 */}
          {analysisState?.error && !isYtAnalyzing && (
            <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <span className="text-red-500 text-base flex-shrink-0 mt-0.5">❌</span>
                <div>
                  <p className="text-xs font-bold text-red-700 mb-1">분석에 실패했습니다</p>
                  <p className="text-xs text-red-600 font-medium">다시 시도해 주세요</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── 설교분석기록 (목록, 검색, 삭제, NEW 표시) ─── */}
          {sermonHistory.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#EAE8E1]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#282622]">📁 설교분석기록</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    {sermonHistory.length}편 보관됨
                  </span>
                </div>

                {/* 검색창 */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF9F5] border border-[#E0DED7] rounded-lg w-full sm:w-60 focus-within:border-[#DA7756]">
                  <Search className="w-3.5 h-3.5 text-[#A5A29B]" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="기록 검색 (제목, 설교자, 교회)"
                    className="w-full bg-transparent text-xs text-[#282622] placeholder-[#A5A29B] focus:outline-none"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="text-[10px] text-[#A5A29B] hover:text-[#282622]"
                    >
                      취소
                    </button>
                  )}
                </div>
              </div>

              {/* 목록 그리드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sermonHistory
                  .filter((item) => {
                    if (!historySearch.trim()) return true;
                    const q = historySearch.toLowerCase();
                    return (
                      (item.title || '').toLowerCase().includes(q) ||
                      (item.church || '').toLowerCase().includes(q) ||
                      (item.preacher || '').toLowerCase().includes(q)
                    );
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#FAF9F5] border border-[#E0DED7] hover:border-[#DA7756] rounded-xl flex items-start justify-between gap-3 transition-all hover:shadow-xs group relative"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-16 h-10 object-cover rounded-lg flex-shrink-0 border border-[#E5E3DB]"
                          />
                        ) : (
                          <div className="w-16 h-10 bg-[#EFECE3] rounded-lg flex items-center justify-center text-xs text-[#807D77] flex-shrink-0">
                            설교
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-[#282622] truncate leading-tight">
                              {item.title}
                            </p>
                            {item.isNew && (
                              <span className="px-1.5 py-0.2 rounded bg-[#DA7756] text-white text-[9px] font-black tracking-tight flex-shrink-0">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#807D77] mt-0.5 truncate">
                            {item.church || item.preacher || '교회/설교자'} &middot; 쇼츠 {item.shortsCount || 5}편
                          </p>
                          <span className="text-[9px] text-[#A5A29B] mt-1 block">{item.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectHistory?.(item)}
                          className="px-2.5 py-1 rounded-lg bg-[#DA7756] hover:bg-[#C56545] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          title="열어서 확인 및 숏폼 제작"
                        >
                          열기 &rarr;
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`'${item.title}' 설교 기록을 삭제하시겠습니까?`)) {
                              onDeleteHistory?.(item.id);
                            }
                          }}
                          className="p-1 text-[#A5A29B] hover:text-red-500 rounded-md transition-colors"
                          title="기록에서 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* ─────────────────────────────────────────────
          MODE 2: 설교 텍스트 올리기 & 분석
      ───────────────────────────────────────────── */}
      {subMode === 'text' && (
        <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#282622]">설교 텍스트 직접 입력</h2>
            <p className="text-xs text-[#807D77] mt-0.5">
              주일 설교 원고 전문이나 요약문을 붙여넣으시면 동일하게 쇼츠와 카드뉴스로 변환됩니다.
            </p>
          </div>

          <form onSubmit={handleTextSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#66635E] mb-1">설교 제목</label>
              <input
                type="text"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="설교 제목을 입력하세요"
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#66635E] mb-1">설교 전문 / 원고 내용</label>
              <textarea
                rows={8}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="설교문 전문을 이곳에 붙여넣으세요...&#10;&#10;예: 사랑하는 성도 여러분, 오늘 우리는 출애굽기 15장 말씀을 통해..."
                className="w-full p-3 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] placeholder-[#A5A29B] focus:outline-none focus:border-[#DA7756] leading-relaxed resize-y font-sans"
              />
            </div>

            {/* 실시간 텍스트 분석 진행 상태 박스 */}
            {isTextAnalyzing && (
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between font-semibold text-amber-950">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" />
                    <span>설교 본문 AI 분석 중...</span>
                  </div>
                  <span className="font-mono text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {textElapsed}초 경과 / 약 10초 소요
                  </span>
                </div>
                <div className="w-full bg-amber-200/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(95, Math.max(8, (textElapsed / 10) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-amber-900">
                  <span>Gemini 3.8 Flash가 설교 원고에서 쇼츠 6편 및 카드뉴스를 구성 중입니다.</span>
                  <span className="font-semibold text-amber-700">예상 소요 시간: 약 10초</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={isTextAnalyzing || !textContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                {isTextAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>원고 분석 중 ({textElapsed}초 / 약 10초)...</span>
                  </>
                ) : (
                  <>
                    <span>텍스트로 콘텐츠 생성 (약 10초 소요)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          MODE 3: 설교 교정 AI
      ───────────────────────────────────────────── */}
      {subMode === 'refine' && (
        <div className="space-y-4">
          
          {/* 교정 서브 3대 기능 탭 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-[#EFECE3] rounded-2xl border border-[#E5E3DB]">
            <button
              onClick={() => setRefineType('draft')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all ${
                refineType === 'draft'
                  ? 'bg-white text-[#282622] shadow-xs'
                  : 'text-[#66635E] hover:text-[#282622]'
              }`}
            >
              1. 미완성 설교 완성하기
            </button>
            <button
              onClick={() => setRefineType('video')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all ${
                refineType === 'video'
                  ? 'bg-white text-[#282622] shadow-xs'
                  : 'text-[#66635E] hover:text-[#282622]'
              }`}
            >
              2. 영상 맞춤 은혜 설교체 교정
            </button>
            <button
              onClick={() => setRefineType('tone')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                refineType === 'tone'
                  ? 'bg-white text-[#282622] shadow-xs'
                  : 'text-[#66635E] hover:text-[#282622]'
              }`}
            >
              <span>3. 설교톤 훈련시키기</span>
              {toneProfile && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#DA7756]/15 text-[#DA7756] font-bold">
                  학습완료
                </span>
              )}
            </button>
          </div>

          {/* 3-1. 미완성 설교 완성 */}
          {refineType === 'draft' && (
            <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#282622]">미완성 설교나 아이디어 입력</h3>
                  <p className="text-xs text-[#807D77] mt-0.5">
                    키워드나 성경 구절, 묵상 메모를 적어주시면 서론, 3대지, 결론, 기도문으로 완성합니다.
                  </p>
                </div>
                {toneProfile && (
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-[#E5E3DB] text-[#DA7756] font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-[#DA7756]" />
                    <span>나의 설교톤 적용됨</span>
                  </span>
                )}
              </div>

              <textarea
                rows={5}
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                placeholder="설교 아이디어나 본문 구절, 전하고 싶은 메시지 포인트를 적어주세요..."
                className="w-full p-3 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756] resize-y font-sans"
              />

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  disabled={isDraftLoading || !ideaInput.trim()}
                  onClick={handleCompleteDraft}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isDraftLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>설교 작성 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#DA7756]" />
                      <span>완성된 설교 작성하기</span>
                    </>
                  )}
                </button>
              </div>

              {/* 완성 결과 영역 */}
              {draftResult && (
                <div className="mt-4 pt-4 border-t border-[#EAE8E1] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#282622]">AI가 완성한 한 편의 설교</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(draftResult, 'draft')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E0DED7] text-[11px] text-[#66635E] hover:bg-[#F2EFE8]"
                      >
                        {copiedKey === 'draft' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>복사</span>
                      </button>
                      <button
                        onClick={() => handleDirectGenerate(draftResult, '완성된 설교')}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#DA7756] hover:bg-[#C56545] text-white text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>쇼츠 & 카드뉴스 바로 만들기 &rarr;</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto font-sans">
                    {draftResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3-2. 영상 맞춤 은혜 설교체 교정 */}
          {refineType === 'video' && (
            <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#282622]">기존 설교문 입력</h3>
                <p className="text-xs text-[#807D77] mt-0.5">
                  영상 낭독 시 귀에 쏙쏙 박히고 감동이 배가되도록, 문장 호흡과 구어체 설교문으로 리라이팅합니다.
                </p>
              </div>

              <textarea
                rows={6}
                value={sermonToRefine}
                onChange={(e) => setSermonToRefine(e.target.value)}
                placeholder="교정하고 싶은 설교 본문이나 특정 구간을 입력하세요...&#10;&#10;예: 밤이 맞도록 수고하였으나 아무것도 얻지 못하였습니다. 그러나 주님의 말씀에 순종하여 그물을 던지겠습니다."
                className="w-full p-3 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756] resize-y font-sans"
              />

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  disabled={isRefineLoading || !sermonToRefine.trim()}
                  onClick={handleRefineForVideo}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isRefineLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>영상체 교정 중...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-[#DA7756]" />
                      <span>영상 맞춤형 설교체로 교정</span>
                    </>
                  )}
                </button>
              </div>

              {/* 교정 결과 영역 */}
              {refinedResult && (
                <div className="mt-4 pt-4 border-t border-[#EAE8E1] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#282622]">영상 낭독용 은혜로운 설교체</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(refinedResult, 'video')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E0DED7] text-[11px] text-[#66635E] hover:bg-[#F2EFE8]"
                      >
                        {copiedKey === 'video' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>복사</span>
                      </button>
                      <button
                        onClick={() => handleDirectGenerate(refinedResult, '영상 맞춤 설교')}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#DA7756] hover:bg-[#C56545] text-white text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>쇼츠 바로 만들기 &rarr;</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto font-sans">
                    {refinedResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3-3. 설교톤 훈련시키기 */}
          {refineType === 'tone' && (
            <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#282622]">목회자 고유 설교톤 AI 학습</h3>
                <p className="text-xs text-[#807D77] mt-0.5">
                  본인이 자주 쓰시는 표현과 어투가 담긴 설교문 샘플을 2~3편 올려주시면, AI가 목회자님의 설교 화법을 그대로 학습합니다.
                </p>
              </div>

              {/* 샘플 리스트 */}
              <div className="space-y-3">
                {toneSamples.map((sample, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#66635E]">
                      <span className="font-semibold font-mono">설교 샘플 {idx + 1}</span>
                      {toneSamples.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSample(idx)}
                          className="text-[#807D77] hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={sample}
                      onChange={(e) => handleSampleChange(idx, e.target.value)}
                      placeholder="본인의 실제 설교문 일부를 넣어주세요..."
                      className="w-full p-2.5 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756] resize-none"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSample}
                  className="w-full py-2 border border-dashed border-[#DCD9CF] hover:border-[#DA7756] text-[#66635E] hover:text-[#DA7756] rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>설교 샘플 추가</span>
                </button>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  disabled={isToneTraining}
                  onClick={handleTrainTone}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isToneTraining ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>설교톤 분석 및 학습 중...</span>
                    </>
                  ) : (
                    <>
                      <Sliders className="w-3.5 h-3.5 text-[#DA7756]" />
                      <span>설교톤 AI 훈련 시작</span>
                    </>
                  )}
                </button>
              </div>

              {/* 학습 완료 프로필 표시 */}
              {toneProfile && (
                <div className="mt-4 p-4 rounded-xl bg-[#FAF9F5] border border-[#E0DED7] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#DA7756]" />
                      <span className="text-xs font-bold text-[#282622]">
                        학습된 나의 설교톤: {toneProfile.toneName}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DA7756]/15 text-[#DA7756] font-bold">
                      프로필 저장됨
                    </span>
                  </div>
                  <p className="text-xs text-[#66635E] leading-relaxed">
                    {toneProfile.summary}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-[#807D77] font-medium">자주 쓰는 어휘:</span>
                    {toneProfile.keywords?.map((k, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#E5E3DB] text-[#282622]">
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#807D77] pt-1">
                    * 이제 '미완성 설교 완성하기'에서 이 설교톤이 자동으로 반영되어 글이 작성됩니다.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
