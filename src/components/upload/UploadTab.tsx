import React, { useState } from 'react';
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
  BookOpen,
  User,
  Church,
  Clock,
} from 'lucide-react';
import YoutubeIcon from '../YoutubeIcon';
import {
  analyzeSermonUrl,
  analyzeSermonText,
  completeSermonDraft,
  refineSermonForVideo,
  trainSermonTone,
} from '../../api/client';
import { SermonAnalysisData } from '../../utils/mockData';
import { GlobalAnalysisState } from '../../App';

interface UploadTabProps {
  sermonData: SermonAnalysisData;
  setSermonData: (data: SermonAnalysisData) => void;
  setYoutubeUrl: (url: string) => void;
  setActiveTab: (tab: string) => void;
  globalAnalysisState?: GlobalAnalysisState;
  onStartAnalysis?: (url: string) => Promise<void>;
}

export default function UploadTab({
  sermonData,
  setSermonData,
  setYoutubeUrl,
  setActiveTab,
  globalAnalysisState,
  onStartAnalysis,
}: UploadTabProps) {
  const [subMode, setSubMode] = useState<'youtube' | 'text' | 'refine'>('youtube');

  // 1. 유튜브 업로드 상태
  const [ytInput, setYtInput] = useState(globalAnalysisState?.url || '');
  const [isYtAnalyzing, setIsYtAnalyzing] = useState(false);

  const isAnalyzing = globalAnalysisState?.isAnalyzing || isYtAnalyzing;
  const elapsedSeconds = globalAnalysisState?.isAnalyzing ? globalAnalysisState.elapsed : 0;
  const currentStage = globalAnalysisState?.isAnalyzing ? globalAnalysisState.stage : '분석 중...';

  // 2. 텍스트 직접 입력
  const [textTitle, setTextTitle] = useState('깊은 곳에 그물을 던지라');
  const [textPassage, setTextPassage] = useState('누가복음 5:1-11');
  const [textPreacher, setTextPreacher] = useState('담임목사');
  const [textContent, setTextContent] = useState('');
  const [isTextAnalyzing, setIsTextAnalyzing] = useState(false);

  // 3. 설교 교정 AI
  const [refineType, setRefineType] = useState<'draft' | 'video' | 'tone'>('draft');
  const [ideaInput, setIdeaInput] = useState(
    '누가복음 5장 1~11절. 밤새 수고했지만 빈 그물뿐이었던 베드로. 인간의 한계와 절망. 그러나 주님의 말씀에 순종하여 깊은 곳에 그물을 내림. 찢어지게 채우심. 결국 사람 낚는 어부로 부르심.'
  );
  const [draftResult, setDraftResult] = useState('');
  const [isDraftLoading, setIsDraftLoading] = useState(false);

  const [sermonToRefine, setSermonToRefine] = useState('');
  const [refinedResult, setRefinedResult] = useState('');
  const [isRefineLoading, setIsRefineLoading] = useState(false);

  const [toneSamples, setToneSamples] = useState([
    '사랑하는 성도 여러분, 살아가면서 우리가 가장 많이 놓치는 것이 무엇입니까? 바로 하나님의 신실하심입니다. 상황은 흔들려도 언약은 흔들리지 않습니다.',
  ]);
  const [toneProfile, setToneProfile] = useState<any>(null);
  const [isToneTraining, setIsToneTraining] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytInput.trim()) return;

    if (onStartAnalysis) {
      await onStartAnalysis(ytInput);
    } else {
      setIsYtAnalyzing(true);
      setYoutubeUrl(ytInput);
      try {
        const data = await analyzeSermonUrl(ytInput);
        setSermonData(data);
      } catch (err: any) {
        alert(`분석 실패: ${err.message || '오류 발생'}`);
      } finally {
        setIsYtAnalyzing(false);
      }
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) {
      alert('설교 본문을 입력해주세요.');
      return;
    }
    setIsTextAnalyzing(true);
    try {
      const data = await analyzeSermonText(textTitle, textContent);
      if (textPassage) data.metadata.passage = textPassage;
      if (textPreacher) data.metadata.preacher = textPreacher;
      data.metadata.sermonText = textContent;
      setSermonData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTextAnalyzing(false);
    }
  };

  const handleCompleteDraft = async () => {
    if (!ideaInput.trim()) return;
    setIsDraftLoading(true);
    try {
      const toneInstruction = toneProfile ? toneProfile.systemInstruction : '';
      const result = await completeSermonDraft(ideaInput, toneInstruction);
      setDraftResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDraftLoading(false);
    }
  };

  const handleRefineForVideo = async () => {
    if (!sermonToRefine.trim()) return;
    setIsRefineLoading(true);
    try {
      const result = await refineSermonForVideo(sermonToRefine);
      setRefinedResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefineLoading(false);
    }
  };

  const handleTrainTone = async () => {
    const valid = toneSamples.filter((s) => s.trim().length > 0);
    if (valid.length === 0) return;
    setIsToneTraining(true);
    try {
      const profile = await trainSermonTone(valid);
      setToneProfile(profile);
    } catch (err) {
      console.error(err);
    } finally {
      setIsToneTraining(false);
    }
  };

  const meta = sermonData?.metadata || {};

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* 서브 모드 탭 */}
      <div className="flex items-center gap-1 p-1 bg-[#EFECE3] rounded-xl w-fit border border-[#E5E3DB]">
        <button
          type="button"
          onClick={() => setSubMode('youtube')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subMode === 'youtube'
              ? 'bg-white text-[#282622] shadow-xs'
              : 'text-[#66635E] hover:text-[#282622]'
          }`}
        >
          <YoutubeIcon className="w-3.5 h-3.5 text-red-600" />
          <span>유튜브 설교</span>
        </button>

        <button
          type="button"
          onClick={() => setSubMode('text')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subMode === 'text'
              ? 'bg-white text-[#282622] shadow-xs'
              : 'text-[#66635E] hover:text-[#282622]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-[#807D77]" />
          <span>설교문 직접 입력</span>
        </button>

        <button
          type="button"
          onClick={() => setSubMode('refine')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subMode === 'refine'
              ? 'bg-white text-[#282622] shadow-xs'
              : 'text-[#66635E] hover:text-[#282622]'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 text-[#DA7756]" />
          <span>설교문 교정</span>
        </button>
      </div>

      {/* 1. 유튜브 설교 입력 */}
      {subMode === 'youtube' && (
        <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-4">
          <form onSubmit={handleYoutubeSubmit} className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl focus-within:border-[#DA7756]">
              <YoutubeIcon className="w-5 h-5 text-red-600 flex-shrink-0 ml-1" />
              <input
                type="text"
                value={ytInput}
                onChange={(e) => setYtInput(e.target.value)}
                placeholder="유튜브 설교 영상 URL (예: https://www.youtube.com/watch?v=...)"
                className="w-full bg-transparent text-xs text-[#282622] placeholder-[#A5A29B] focus:outline-none"
              />
            </div>

            {isAnalyzing && (
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between font-semibold text-amber-950">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>설교 본문 파트 심층 분석 중...</span>
                  </div>
                  <span className="font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                    {elapsedSeconds}초 경과
                  </span>
                </div>
                <div className="w-full bg-amber-200/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(96, Math.max(10, elapsedSeconds * 5))}%` }}
                  />
                </div>
                <div className="text-[11px] text-amber-900">{currentStage}</div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isAnalyzing || !ytInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>분석 중 ({elapsedSeconds}초)...</span>
                  </>
                ) : (
                  <>
                    <span>설교 본문 분석 실행</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. 텍스트 직접 입력 */}
      {subMode === 'text' && (
        <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-3">
          <form onSubmit={handleTextSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#66635E] mb-1">설교 제목</label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#66635E] mb-1">본문 성경</label>
                <input
                  type="text"
                  value={textPassage}
                  onChange={(e) => setTextPassage(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#66635E] mb-1">설교자</label>
                <input
                  type="text"
                  value={textPreacher}
                  onChange={(e) => setTextPreacher(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#66635E] mb-1">설교 본문 전문</label>
              <textarea
                rows={8}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="설교 원고 전문을 입력하세요..."
                className="w-full p-3 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] placeholder-[#A5A29B] focus:outline-none focus:border-[#DA7756] leading-relaxed resize-y font-sans"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isTextAnalyzing || !textContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                {isTextAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>분석 중...</span>
                  </>
                ) : (
                  <>
                    <span>설교문 분석 완료</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. 설교문 교정 모드 */}
      {subMode === 'refine' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#EFECE3] rounded-xl border border-[#E5E3DB]">
            <button
              onClick={() => setRefineType('draft')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold text-center transition-all ${
                refineType === 'draft' ? 'bg-white text-[#282622] shadow-xs' : 'text-[#66635E]'
              }`}
            >
              대지 설교 완성
            </button>
            <button
              onClick={() => setRefineType('video')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold text-center transition-all ${
                refineType === 'video' ? 'bg-white text-[#282622] shadow-xs' : 'text-[#66635E]'
              }`}
            >
              영상 구어체 교정
            </button>
            <button
              onClick={() => setRefineType('tone')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold text-center transition-all ${
                refineType === 'tone' ? 'bg-white text-[#282622] shadow-xs' : 'text-[#66635E]'
              }`}
            >
              설교톤 학습
            </button>
          </div>

          {refineType === 'draft' && (
            <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-3">
              <textarea
                rows={5}
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                placeholder="설교 아이디어 또는 메모..."
                className="w-full p-3 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756] resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isDraftLoading || !ideaInput.trim()}
                  onClick={handleCompleteDraft}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isDraftLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#DA7756]" />}
                  <span>대지 설교문 작성</span>
                </button>
              </div>

              {draftResult && (
                <div className="mt-3 pt-3 border-t border-[#EAE8E1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#282622]">완성된 설교문</span>
                    <button
                      onClick={() => handleCopy(draftResult, 'draft')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0DED7] text-[11px] text-[#66635E]"
                    >
                      {copiedKey === 'draft' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>복사</span>
                    </button>
                  </div>
                  <div className="p-3 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto">
                    {draftResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {refineType === 'video' && (
            <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-3">
              <textarea
                rows={5}
                value={sermonToRefine}
                onChange={(e) => setSermonToRefine(e.target.value)}
                placeholder="교정할 설교 원문..."
                className="w-full p-3 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none focus:border-[#DA7756] resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isRefineLoading || !sermonToRefine.trim()}
                  onClick={handleRefineForVideo}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isRefineLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-[#DA7756]" />}
                  <span>영상 구어체로 교정</span>
                </button>
              </div>

              {refinedResult && (
                <div className="mt-3 pt-3 border-t border-[#EAE8E1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#282622]">교정된 구어체 설교문</span>
                    <button
                      onClick={() => handleCopy(refinedResult, 'video')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0DED7] text-[11px] text-[#66635E]"
                    >
                      {copiedKey === 'video' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>복사</span>
                    </button>
                  </div>
                  <div className="p-3 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto">
                    {refinedResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {refineType === 'tone' && (
            <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-3">
              {toneSamples.map((sample, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#66635E]">
                    <span className="font-semibold font-mono">설교 샘플 {idx + 1}</span>
                    {toneSamples.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setToneSamples(toneSamples.filter((_, i) => i !== idx))}
                        className="text-[#807D77] hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={sample}
                    onChange={(e) => {
                      const updated = [...toneSamples];
                      updated[idx] = e.target.value;
                      setToneSamples(updated);
                    }}
                    className="w-full p-2 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs text-[#282622] focus:outline-none"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setToneSamples([...toneSamples, ''])}
                  className="flex items-center gap-1 text-xs text-[#66635E] hover:text-[#282622]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>샘플 추가</span>
                </button>
                <button
                  type="button"
                  disabled={isToneTraining}
                  onClick={handleTrainTone}
                  className="px-4 py-2 rounded-xl bg-[#282622] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isToneTraining ? '분석 중...' : '설교톤 학습 실행'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 추출된 설교 본문 결과 카드 (요구사항 1: 설교제목, 본문, 설교자, 설교 본문 파트 추출 확인) */}
      {meta.title && (
        <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#F2EFE8] pb-3">
            <span className="text-xs font-bold text-[#282622] font-mono uppercase tracking-wider">
              추출된 설교 본문 정보
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('shorts')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DA7756] hover:bg-[#C56545] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <span>쇼츠 생성 페이지 이동</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
              <span className="text-[10px] text-[#807D77] font-semibold block mb-0.5">설교 제목</span>
              <span className="font-bold text-[#282622] line-clamp-1">{meta.title}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
              <span className="text-[10px] text-[#807D77] font-semibold block mb-0.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>본문 성경</span>
              </span>
              <span className="font-bold text-[#282622] line-clamp-1">{meta.passage || '성경 구절'}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
              <span className="text-[10px] text-[#807D77] font-semibold block mb-0.5 flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>설교자</span>
              </span>
              <span className="font-bold text-[#282622] line-clamp-1">{meta.preacher || '담임목사'}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
              <span className="text-[10px] text-[#807D77] font-semibold block mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>설교 파트 구간</span>
              </span>
              <span className="font-bold text-[#282622]">
                {meta.sermonStartTime && meta.sermonEndTime
                  ? `${meta.sermonStartTime} ~ ${meta.sermonEndTime}`
                  : meta.videoDuration || '본문 분석 완료'}
              </span>
            </div>
          </div>

          {meta.sermonText && (
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-[#66635E] block mb-1">추출된 설교문 (자막 전문)</span>
              <div className="p-3.5 bg-[#FAF9F5] border border-[#EAE8E1] rounded-xl text-xs text-[#3E3C38] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line font-sans">
                {meta.sermonText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
