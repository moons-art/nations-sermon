import { useState, useEffect } from 'react';
import {
  Music,
  Building2,
  User,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Video,
  Check,
  Loader2,
} from 'lucide-react';
import YoutubeIcon from '../YoutubeIcon';
import InstagramIcon from '../InstagramIcon';
import HighlightCard from './HighlightCard';
import SubtitleModal from './SubtitleModal';
import { queueRenderItems, fetchBgmList, generateShortsFromSermon, BgmItem } from '../../api/client';
import { SermonAnalysisData, ShortItem, SentenceItem } from '../../utils/mockData';

interface ShortsTabProps {
  sermonData: SermonAnalysisData;
  setSermonData: (data: SermonAnalysisData) => void;
  youtubeUrl?: string;
  onShortsQueued?: () => void;
  onNavigateToShortsList?: () => void;
}

export default function ShortsTab({
  sermonData,
  setSermonData,
  youtubeUrl,
  onShortsQueued,
  onNavigateToShortsList,
}: ShortsTabProps) {
  const [platform, setPlatform] = useState<'youtube' | 'instagram'>('youtube');
  const [template, setTemplate] = useState('dark_minimal');

  const [selectedShortIds, setSelectedShortIds] = useState<string[]>(['short-1', 'short-2']);
  const [bgm, setBgm] = useState('grace.mp3');
  const [bgmList, setBgmList] = useState<BgmItem[]>([]);
  const [churchName, setChurchName] = useState(sermonData.metadata?.churchName || '오륜교회\n예배공동체');
  const [preacherName, setPreacherName] = useState(sermonData.metadata?.preacher || '김은호 목사');

  const [isGeneratingShorts, setIsGeneratingShorts] = useState(false);
  const [editingShort, setEditingShort] = useState<ShortItem | null>(null);
  const [renderingShortId, setRenderingShortId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync metadata
  useEffect(() => {
    if (sermonData.metadata?.churchName) setChurchName(sermonData.metadata.churchName);
    if (sermonData.metadata?.preacher) setPreacherName(sermonData.metadata.preacher);
  }, [sermonData.metadata]);

  useEffect(() => {
    fetchBgmList().then(setBgmList).catch(console.error);
  }, []);

  const displayedShorts = sermonData.shorts?.slice(0, 5) || [];

  // 1) 상단 '쇼츠영상 생성' 버튼 핸들러 (설교 본문에서 하이라이트 5개 추출)
  const handleGenerateShortsCandidates = async () => {
    setIsGeneratingShorts(true);
    try {
      const generated = await generateShortsFromSermon(sermonData);
      setSermonData({
        ...sermonData,
        shorts: generated,
      });
      setSelectedShortIds(generated.slice(0, 3).map((s: any) => s.id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingShorts(false);
    }
  };

  const handleToggleSelect = (shortId: string) => {
    setSelectedShortIds((prev) =>
      prev.includes(shortId) ? prev.filter((id) => id !== shortId) : [...prev, shortId]
    );
  };

  const handleSelectAll = () => {
    if (selectedShortIds.length === displayedShorts.length) {
      setSelectedShortIds([]);
    } else {
      setSelectedShortIds(displayedShorts.map((s) => s.id));
    }
  };

  const handleSaveSubtitles = (
    shortId: string,
    newSentences: SentenceItem[],
    newQuestion?: string,
    newAnswer?: string
  ) => {
    const updatedShorts = sermonData.shorts.map((s) =>
      s.id === shortId
        ? {
            ...s,
            sentences: newSentences,
            ...(newQuestion ? { title_question: newQuestion } : {}),
            ...(newAnswer ? { title_answer: newAnswer } : {}),
          }
        : s
    );
    setSermonData({ ...sermonData, shorts: updatedShorts });
  };

  const triggerQueueRender = async (itemsToRender: ShortItem[], singleShortId: string | null = null) => {
    if (singleShortId) setRenderingShortId(singleShortId);
    else setIsSubmitting(true);

    try {
      const payload = itemsToRender.map((s) => ({
        short_id: s.id,
        title: s.title,
        title_question: s.title_question || s.hook || s.title,
        title_answer: s.title_answer || s.title,
        start_time: s.startTime,
        end_time: s.endTime,
        duration: s.duration,
        sentences: s.sentences,
        bgm: bgm,
        template: template,
        platform: platform,
        church_name: `${preacherName ? preacherName + ' • ' : ''}${churchName}`,
        youtube_url: youtubeUrl,
      }));

      await queueRenderItems(payload);

      if (onShortsQueued) onShortsQueued();
      if (onNavigateToShortsList) onNavigateToShortsList();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setRenderingShortId(null);
    }
  };

  const handleBatchRender = () => {
    const targetShorts = displayedShorts.filter((s) => selectedShortIds.includes(s.id));
    if (targetShorts.length === 0) {
      alert('쇼츠를 1개 이상 선택해주세요.');
      return;
    }
    triggerQueueRender(targetShorts);
  };

  const handleSingleRender = (short: ShortItem) => {
    triggerQueueRender([short], short.id);
  };

  const templateList = [
    {
      id: 'dark_minimal',
      name: '블랙 미니멀',
      previewBg: 'bg-[#0E0E10]',
      header1: 'bg-white',
      header2: 'bg-[#FFE600]',
      videoBox: 'bg-[#1C1D22] border-white/20',
      subtitle: 'bg-white/90',
      crossColor: 'text-white/80',
    },
    {
      id: 'yellow_frame',
      name: '옐로우 프레임',
      previewBg: 'bg-[#F4CF42]',
      header1: 'bg-[#121212]',
      header2: 'bg-[#181A22]',
      videoBox: 'bg-[#1A1A1A] border-black/20',
      subtitle: 'bg-black/90',
      crossColor: 'text-[#121212]',
    },
    {
      id: 'vivid_blue',
      name: '비비드 블루',
      previewBg: 'bg-[#1E62D0]',
      header1: 'bg-white',
      header2: 'bg-white',
      videoBox: 'bg-[#123E88] border-white/30',
      subtitle: 'bg-[#FFF360]',
      crossColor: 'text-white/90',
    },
    {
      id: 'modern_grey',
      name: '모던 그레이',
      previewBg: 'bg-[#25282F]',
      header1: 'bg-[#D8D8D8]',
      header2: 'bg-white',
      videoBox: 'bg-[#17191E] border-white/20',
      subtitle: 'bg-white/90',
      crossColor: 'text-[#C5C5C5]',
    },
    {
      id: 'full_cinema',
      name: '풀스크린 시네마',
      previewBg: 'bg-slate-900',
      isCinema: true,
      header1: 'bg-white/80',
      header2: 'bg-[#FFE600]',
      videoBox: null,
      subtitle: 'bg-white',
      crossColor: 'text-white/80',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn pb-12">
      {/* 🌟 1단계: 상단 '쇼츠영상 생성' 메인 실행 바 (요구사항 2) */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#282622] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#DA7756]" />
            <span>설교 본문 하이라이트 쇼츠</span>
          </h2>
          <span className="text-[11px] text-[#807D77]">
            {sermonData.metadata?.title || '설교 영상'}
          </span>
        </div>

        <button
          type="button"
          disabled={isGeneratingShorts}
          onClick={handleGenerateShortsCandidates}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#DA7756] hover:bg-[#C56545] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {isGeneratingShorts ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>하이라이트 5개 추출 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>쇼츠영상 생성</span>
            </>
          )}
        </button>
      </div>

      {/* 2단계: 옵션 설정 (플랫폼, 템플릿, BGM, 교회명, 설교자명) */}
      <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-4">
        {/* 플랫폼 선택 */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPlatform('youtube')}
            className={`p-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
              platform === 'youtube'
                ? 'border-[#DA7756] bg-[#FAF9F5] text-[#282622] font-bold'
                : 'border-[#EAE8E1] bg-white text-[#66635E]'
            }`}
          >
            <YoutubeIcon className="w-4 h-4 text-red-600" />
            <span className="text-xs">유튜브 쇼츠 (9:16)</span>
            {platform === 'youtube' && <Check className="w-4 h-4 text-[#DA7756] ml-auto" />}
          </button>

          <button
            type="button"
            onClick={() => setPlatform('instagram')}
            className={`p-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
              platform === 'instagram'
                ? 'border-[#DA7756] bg-[#FAF9F5] text-[#282622] font-bold'
                : 'border-[#EAE8E1] bg-white text-[#66635E]'
            }`}
          >
            <InstagramIcon className="w-4 h-4 text-pink-600" />
            <span className="text-xs">인스타그램 릴스 (9:16)</span>
            {platform === 'instagram' && <Check className="w-4 h-4 text-[#DA7756] ml-auto" />}
          </button>
        </div>

        {/* 템플릿 선택 (설명 텍스트 제거) */}
        <div>
          <label className="text-xs font-bold text-[#282622] block mb-2 font-mono">
            템플릿 선택
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {templateList.map((tpl) => {
              const isSelected = template === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setTemplate(tpl.id)}
                  className={`cursor-pointer rounded-xl p-2 border-2 transition-all flex flex-col items-center justify-between gap-2 relative ${
                    isSelected
                      ? 'border-[#DA7756] bg-[#FAF9F5]'
                      : 'border-[#EAE8E1] bg-white hover:border-[#DCD9CF]'
                  }`}
                >
                  <div
                    className={`w-full aspect-[9/14] rounded-lg ${tpl.previewBg} p-1.5 flex flex-col justify-between items-center relative overflow-hidden border border-black/10`}
                  >
                    <div className="w-full text-center space-y-0.5 pt-0.5 z-10">
                      <div className={`w-3/4 h-1 mx-auto rounded-full ${tpl.header1}`}></div>
                      <div className={`w-1/2 h-1 mx-auto rounded-full ${tpl.header2}`}></div>
                    </div>

                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center z-10">
                      <span className="text-[8px] text-white">▶</span>
                    </div>

                    <div className="w-full text-center space-y-0.5 pb-0.5 z-10">
                      <div className={`w-4/5 h-1 mx-auto rounded-full ${tpl.subtitle}`}></div>
                      <span className={`text-[7px] font-bold block ${tpl.crossColor}`}>✝</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold truncate block ${
                      isSelected ? 'text-[#DA7756]' : 'text-[#282622]'
                    }`}
                  >
                    {tpl.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 입력란: BGM, 교회/채널 이름, 설교자 이름 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-xs font-semibold text-[#66635E] flex items-center gap-1 mb-1">
              <Music className="w-3.5 h-3.5 text-[#807D77]" />
              <span>배경음악 (BGM)</span>
            </label>
            <select
              value={bgm}
              onChange={(e) => setBgm(e.target.value)}
              className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] focus:outline-none focus:border-[#DA7756]"
            >
              {bgmList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#66635E] flex items-center gap-1 mb-1">
              <Building2 className="w-3.5 h-3.5 text-[#807D77]" />
              <span>교회/채널 이름</span>
            </label>
            <input
              type="text"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              placeholder="오륜교회"
              className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] focus:outline-none focus:border-[#DA7756]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#66635E] flex items-center gap-1 mb-1">
              <User className="w-3.5 h-3.5 text-[#807D77]" />
              <span>설교자 이름</span>
            </label>
            <input
              type="text"
              value={preacherName}
              onChange={(e) => setPreacherName(e.target.value)}
              placeholder="김은호 목사"
              className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] focus:outline-none focus:border-[#DA7756]"
            />
          </div>
        </div>
      </div>

      {/* 3단계: 하이라이트 쇼츠 5개 목록 및 일괄 제작 실행 */}
      <div className="space-y-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-xs font-medium text-[#66635E] hover:text-[#282622]"
            >
              {selectedShortIds.length === displayedShorts.length ? (
                <CheckSquare className="w-4 h-4 text-[#DA7756]" />
              ) : (
                <Square className="w-4 h-4 text-[#DCD9CF]" />
              )}
              <span>전체 선택 ({selectedShortIds.length}/{displayedShorts.length})</span>
            </button>
            <span className="text-xs font-bold text-[#282622]">쇼츠 후보 5개</span>
          </div>

          <button
            type="button"
            disabled={isSubmitting || selectedShortIds.length === 0}
            onClick={handleBatchRender}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
          >
            <Video className="w-3.5 h-3.5" />
            <span>영상 생성 ({selectedShortIds.length}개)</span>
          </button>
        </div>

        {/* 5개 쇼츠 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedShorts.map((short, idx) => (
            <HighlightCard
              key={short.id}
              short={short}
              index={idx}
              isSelected={selectedShortIds.includes(short.id)}
              onToggleSelect={handleToggleSelect}
              onOpenSubtitleModal={setEditingShort}
              onSingleRender={handleSingleRender}
              isRendering={renderingShortId === short.id || isSubmitting}
              youtubeUrl={youtubeUrl}
              template={template}
              churchName={`${preacherName ? preacherName + ' • ' : ''}${churchName}`}
            />
          ))}
        </div>
      </div>

      {/* 자막 수정 모달 */}
      {editingShort && (
        <SubtitleModal
          shortItem={editingShort}
          onClose={() => setEditingShort(null)}
          onSave={handleSaveSubtitles}
        />
      )}
    </div>
  );
}
