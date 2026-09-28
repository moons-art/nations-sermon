import React, { useState, useEffect } from 'react';
import {
  Music,
  Building2,
  Play,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle,
  Video,
  Check,
} from 'lucide-react';
import YoutubeIcon from '../YoutubeIcon';
import InstagramIcon from '../InstagramIcon';
import HighlightCard from './HighlightCard';
import SubtitleModal from './SubtitleModal';
import { queueRenderItems, fetchBgmList } from '../../api/client';

export default function ShortsTab({
  sermonData,
  setSermonData,
  youtubeUrl,
  onShortsQueued,
  onNavigateToShortsList,
}) {
  // 1. 쇼츠 선택 (플랫폼): 'youtube' (유튜브용) vs 'instagram' (인스타용)
  const [platform, setPlatform] = useState('youtube');

  // 2. 5대 템플릿 선택 (유튜브 레퍼런스 기반):
  // 'dark_minimal' | 'yellow_frame' | 'vivid_blue' | 'modern_grey' | 'full_cinema'
  const [template, setTemplate] = useState('dark_minimal');

  // 선택된 쇼츠 ID들 (기본 1, 2번 선택)
  const [selectedShortIds, setSelectedShortIds] = useState(['short-1', 'short-2']);

  const [bgm, setBgm] = useState('grace.mp3');
  const [bgmList, setBgmList] = useState([]);
  const [churchName, setChurchName] = useState(sermonData.metadata?.churchName || '오륜교회\n예배공동체');
  const [editingShort, setEditingShort] = useState(null);
  const [renderingShortId, setRenderingShortId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatedNotice, setShowCreatedNotice] = useState(false);

  // 감동적인 쇼츠 5개 제공
  const displayedShorts = sermonData.shorts?.slice(0, 5) || [];

  useEffect(() => {
    fetchBgmList().then(setBgmList).catch(console.error);
  }, []);

  const handleToggleSelect = (shortId) => {
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

  const handleSaveSubtitles = (shortId, newSentences, newQuestion, newAnswer) => {
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

  const triggerQueueRender = async (itemsToRender, singleShortId = null) => {
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
        church_name: churchName,
        youtube_url: youtubeUrl,
      }));

      await queueRenderItems(payload);

      // 사이드바 알림 가동
      if (onShortsQueued) onShortsQueued();

      setShowCreatedNotice(true);
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
      alert('렌더링할 쇼츠를 최소 1개 이상 선택해주세요.');
      return;
    }
    triggerQueueRender(targetShorts);
  };

  const handleSingleRender = (short) => {
    triggerQueueRender([short], short.id);
  };

  // 5대 템플릿 정의 (설명글 없이 심플한 비주얼 & 타이틀만)
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
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* 렌더링 완료 안내 배너 */}
      {showCreatedNotice && (
        <div className="p-4 bg-[#FAF9F5] border border-[#DA7756] rounded-2xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-[#DA7756]" />
            <div>
              <p className="text-xs font-bold text-[#282622]">
                선택한 쇼츠 영상이 순차 렌더링 큐에 등록되었습니다!
              </p>
              <p className="text-[11px] text-[#807D77] mt-0.5">
                생성된 쇼츠는 좌측의 <strong>[쇼츠 목록]</strong> 메뉴에서 실시간 진행 확인 및 MP4 다운로드가 가능합니다.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (onNavigateToShortsList) onNavigateToShortsList();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#DA7756] hover:bg-[#C56545] text-white text-xs font-semibold transition-colors"
          >
            <span>쇼츠 목록으로 가기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. 쇼츠 선택 (유튜브용 vs 인스타용) */}
      <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#282622] flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Video className="w-3.5 h-3.5 text-[#DA7756]" />
            <span>쇼츠 선택 (플랫폼)</span>
          </h3>
          <span className="text-[11px] text-[#807D77]">
            플랫폼별 UI 세이프존 자막 및 레이아웃이 자동 적용됩니다
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* 유튜브용 */}
          <button
            type="button"
            onClick={() => setPlatform('youtube')}
            className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-center gap-2.5 ${
              platform === 'youtube'
                ? 'border-[#DA7756] bg-[#FAF9F5] shadow-xs text-[#282622]'
                : 'border-[#EAE8E1] bg-white text-[#66635E] hover:border-[#DCD9CF]'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${platform === 'youtube' ? 'bg-[#DA7756] text-white' : 'bg-[#F2EFE8] text-[#807D77]'}`}>
              <YoutubeIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>유튜브용</span>
                <span className="text-[10px] font-mono text-[#807D77] font-normal">(Shorts 9:16)</span>
              </div>
            </div>
            {platform === 'youtube' && <Check className="w-4 h-4 text-[#DA7756] ml-auto" />}
          </button>

          {/* 인스타용 */}
          <button
            type="button"
            onClick={() => setPlatform('instagram')}
            className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-center gap-2.5 ${
              platform === 'instagram'
                ? 'border-[#DA7756] bg-[#FAF9F5] shadow-xs text-[#282622]'
                : 'border-[#EAE8E1] bg-white text-[#66635E] hover:border-[#DCD9CF]'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${platform === 'instagram' ? 'bg-[#DA7756] text-white' : 'bg-[#F2EFE8] text-[#807D77]'}`}>
              <InstagramIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>인스타용</span>
                <span className="text-[10px] font-mono text-[#807D77] font-normal">(Reels 9:16)</span>
              </div>
            </div>
            {platform === 'instagram' && <Check className="w-4 h-4 text-[#DA7756] ml-auto" />}
          </button>
        </div>
      </div>

      {/* 2. 탬플릿 선택 (5개 템플릿, 설명글 없이 직관적인 비주얼 선택) */}
      <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#282622] flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Layers className="w-3.5 h-3.5 text-[#DA7756]" />
            <span>탬플릿 선택</span>
          </h3>
          <span className="text-[11px] text-[#807D77]">
            실제 인기 설교 쇼츠 벤치마킹 디자인 프리셋 (5종)
          </span>
        </div>

        {/* 5개 템플릿 미니멀 비주얼 카드 (설명글 없음) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {templateList.map((tpl) => {
            const isSelected = template === tpl.id;

            return (
              <div
                key={tpl.id}
                onClick={() => setTemplate(tpl.id)}
                className={`group cursor-pointer rounded-2xl p-2.5 border-2 transition-all flex flex-col items-center justify-between gap-2.5 relative select-none ${
                  isSelected
                    ? 'border-[#DA7756] bg-[#FAF9F5] shadow-xs'
                    : 'border-[#EAE8E1] bg-white hover:border-[#DCD9CF]'
                }`}
              >
                {/* 9:16 비율 미니 비주얼 프리뷰 */}
                <div
                  className={`w-full aspect-[9/15] rounded-xl ${tpl.previewBg} p-2 flex flex-col justify-between items-center relative overflow-hidden shadow-inner border border-black/10`}
                >
                  {/* 시네마 모드일 때 배경 이미지 */}
                  {tpl.isCinema && (
                    <img
                      src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=300&auto=format&fit=crop&q=80"
                      alt="시네마 배경"
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                  )}

                  {/* 상단 2줄 헤더 바 */}
                  <div className="relative z-10 w-full text-center space-y-1 pt-0.5">
                    <div className={`w-3/4 h-1.5 mx-auto rounded-full ${tpl.header1}`}></div>
                    <div className={`w-1/2 h-1.5 mx-auto rounded-full ${tpl.header2}`}></div>
                  </div>

                  {/* 중앙 비디오 영역 */}
                  {tpl.videoBox ? (
                    <div className={`relative z-10 w-full aspect-video rounded-lg ${tpl.videoBox} border flex items-center justify-center shadow-xs`}>
                      <Play className="w-2.5 h-2.5 fill-white/80 text-white/80" />
                    </div>
                  ) : (
                    <div className="relative z-10 w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center">
                      <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
                    </div>
                  )}

                  {/* 하단 자막 & 미니 십자가 */}
                  <div className="relative z-10 w-full text-center space-y-1 pb-0.5">
                    <div className={`w-4/5 h-1.5 mx-auto rounded-full ${tpl.subtitle}`}></div>
                    <span className={`text-[8px] font-sans font-bold block leading-none ${tpl.crossColor}`}>
                      ✝
                    </span>
                  </div>
                </div>

                {/* 템플릿 이름 (설명글 없음) */}
                <div className="w-full text-center">
                  <span
                    className={`text-xs font-bold truncate block ${
                      isSelected ? 'text-[#DA7756]' : 'text-[#282622]'
                    }`}
                  >
                    {tpl.name}
                  </span>
                </div>

                {/* 선택 마크 */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#DA7756] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BGM 및 교회명 설정 바 */}
      <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* BGM 선택 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#66635E] flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-[#807D77]" />
            <span>배경음악 (오디오 더킹 자동 믹싱)</span>
          </label>
          <select
            value={bgm}
            onChange={(e) => setBgm(e.target.value)}
            className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756]"
          >
            {bgmList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.desc}
              </option>
            ))}
          </select>
        </div>

        {/* 교회 로고 / 교회명 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#66635E] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#807D77]" />
            <span>최하단 교회 이름 (줄바꿈 가능)</span>
          </label>
          <input
            type="text"
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
            placeholder="마산제일교회"
            className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756]"
          />
        </div>
      </div>

      {/* 4. 감동적인 쇼츠 5개 섹션 */}
      <div className="space-y-4">
        {/* 상단 컨트롤 바 */}
        <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1] flex flex-wrap items-center justify-between gap-3">
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

            <span className="text-[#DCD9CF]">|</span>

            <span className="text-xs font-bold text-[#282622] font-mono">
              감동적인 쇼츠 5개
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting || selectedShortIds.length === 0}
              onClick={handleBatchRender}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>선택한 {selectedShortIds.length}개 영상 일괄 생성</span>
            </button>
          </div>
        </div>

        {/* 5개 쇼츠 카드 그리드 (실제 9:16 비디오 플레이어 & 템플릿 프리뷰 연동) */}
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
              churchName={churchName}
            />
          ))}
        </div>
      </div>

      {/* 자막 및 텍스트 수정 모달 */}
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
