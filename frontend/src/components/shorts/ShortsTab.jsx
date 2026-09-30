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
  Film,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Edit3,
} from 'lucide-react';
import YoutubeIcon from '../YoutubeIcon';
import InstagramIcon from '../InstagramIcon';
import HighlightCard from './HighlightCard';
import SubtitleModal from './SubtitleModal';
import { queueRenderItems, fetchBgmList } from '../../api/client';

// ─── 쇼츠 생성 단계 상수 ───
const STEP_SELECT = 'select';    // 하이라이트 선택 & 설정
const STEP_RENDER = 'render';    // 영상 생성 중

export default function ShortsTab({
  sermonData,
  setSermonData,
  youtubeUrl,
  onShortsQueued,
  onNavigateToShortsList,
}) {
  // ── 쇼츠 생성 단계
  const [step, setStep] = useState(STEP_SELECT);

  // ── 플랫폼
  const [platform, setPlatform] = useState('youtube');

  // ── 템플릿
  const [template, setTemplate] = useState('dark_minimal');

  // ── 선택된 쇼츠 IDs
  const displayedShorts = sermonData?.shorts?.slice(0, 5) || [];
  const [selectedShortIds, setSelectedShortIds] = useState([]);

  // 처음 데이터 로드 시 전체 선택
  useEffect(() => {
    if (displayedShorts.length > 0 && selectedShortIds.length === 0) {
      setSelectedShortIds(displayedShorts.map(s => s.id));
    }
  }, [displayedShorts.length]);

  // ── BGM / 교회명 / 설교자
  const [bgm, setBgm] = useState('grace.mp3');
  const [bgmList, setBgmList] = useState([]);
  const [churchName, setChurchName] = useState(
    sermonData?.metadata?.churchName || ''
  );
  const [preacher, setPreacher] = useState(
    sermonData?.metadata?.preacher || ''
  );

  // ── 메타 업데이트 (분석 결과가 들어올 때)
  useEffect(() => {
    if (sermonData?.metadata?.churchName && !churchName) {
      setChurchName(sermonData.metadata.churchName);
    }
    if (sermonData?.metadata?.preacher && !preacher) {
      setPreacher(sermonData.metadata.preacher);
    }
  }, [sermonData?.metadata]);

  // ── 자막 편집 모달
  const [editingShort, setEditingShort] = useState(null);

  // ── 렌더링 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renderingShortId, setRenderingShortId] = useState(null);
  const [showCreatedNotice, setShowCreatedNotice] = useState(false);

  // ── 템플릿 접기/펼치기
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    fetchBgmList().then(setBgmList).catch(console.error);
  }, []);

  const handleToggleSelect = (shortId) => {
    setSelectedShortIds(prev =>
      prev.includes(shortId) ? prev.filter(id => id !== shortId) : [...prev, shortId]
    );
  };

  const handleSelectAll = () => {
    if (selectedShortIds.length === displayedShorts.length) {
      setSelectedShortIds([]);
    } else {
      setSelectedShortIds(displayedShorts.map(s => s.id));
    }
  };

  const handleSaveSubtitles = (shortId, newSentences, newQuestion, newAnswer) => {
    const updatedShorts = sermonData.shorts.map(s =>
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

  // ── 영상 생성 실행
  const triggerQueueRender = async (itemsToRender, singleShortId = null) => {
    if (singleShortId) setRenderingShortId(singleShortId);
    else setIsSubmitting(true);

    try {
      const payload = itemsToRender.map(s => ({
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
      if (onShortsQueued) onShortsQueued();
      setShowCreatedNotice(true);
    } catch (err) {
      console.error(err);
      alert(`렌더링 등록 실패: ${err.message || '서버 오류'}`);
    } finally {
      setIsSubmitting(false);
      setRenderingShortId(null);
    }
  };

  const handleBatchRender = () => {
    const targets = displayedShorts.filter(s => selectedShortIds.includes(s.id));
    if (targets.length === 0) {
      alert('영상을 생성할 쇼츠를 최소 1개 선택해주세요.');
      return;
    }
    triggerQueueRender(targets);
  };

  const handleSingleRender = (short) => triggerQueueRender([short], short.id);

  // ── 데이터 없을 때
  const hasShorts = displayedShorts.length > 0;

  // ── 5대 템플릿 정의
  const templateList = [
    {
      id: 'dark_minimal', name: '블랙 미니멀',
      previewBg: 'bg-[#0E0E10]', header1: 'bg-white', header2: 'bg-[#FFE600]',
      videoBox: 'bg-[#1C1D22] border-white/20', subtitle: 'bg-white/90', crossColor: 'text-white/80',
    },
    {
      id: 'yellow_frame', name: '옐로우 프레임',
      previewBg: 'bg-[#F4CF42]', header1: 'bg-[#121212]', header2: 'bg-[#181A22]',
      videoBox: 'bg-[#1A1A1A] border-black/20', subtitle: 'bg-black/90', crossColor: 'text-[#121212]',
    },
    {
      id: 'vivid_blue', name: '비비드 블루',
      previewBg: 'bg-[#1E62D0]', header1: 'bg-white', header2: 'bg-white',
      videoBox: 'bg-[#123E88] border-white/30', subtitle: 'bg-[#FFF360]', crossColor: 'text-white/90',
    },
    {
      id: 'modern_grey', name: '모던 그레이',
      previewBg: 'bg-[#25282F]', header1: 'bg-[#D8D8D8]', header2: 'bg-white',
      videoBox: 'bg-[#17191E] border-white/20', subtitle: 'bg-white/90', crossColor: 'text-[#C5C5C5]',
    },
    {
      id: 'full_cinema', name: '풀스크린 시네마',
      previewBg: 'bg-slate-900', isCinema: true, header1: 'bg-white/80', header2: 'bg-[#FFE600]',
      videoBox: null, subtitle: 'bg-white', crossColor: 'text-white/80',
    },
  ];

  const selectedTemplate = templateList.find(t => t.id === template);

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn pb-12">

      {/* ── 데이터 없을 때 안내 ── */}
      {!hasShorts && (
        <div className="bg-white rounded-2xl p-10 border border-dashed border-[#DCD9CF] text-center space-y-3">
          <Film className="w-9 h-9 text-[#A5A29B] mx-auto" />
          <div>
            <p className="text-sm font-bold text-[#282622]">분석된 설교 영상이 없습니다</p>
            <p className="text-xs text-[#807D77] mt-1">
              먼저 <strong className="text-[#DA7756]">[나의 설교 업로드]</strong> 탭에서 유튜브 URL을 분석해주세요.
            </p>
          </div>
        </div>
      )}

      {hasShorts && (
        <>
          {/* ───────────────────────────────────────
              상단 CTA: 쇼츠영상 생성 버튼
          ─────────────────────────────────────── */}
          <div className="bg-[#1C1B18] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DA7756] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  쇼츠 영상 생성
                </p>
                <p className="text-[11px] text-white/60 mt-0.5">
                  선택한 {selectedShortIds.length}개 하이라이트 → 실제 9:16 MP4 영상 제작
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {showCreatedNotice ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  <span>렌더링 큐 등록 완료!</span>
                  <button
                    onClick={() => onNavigateToShortsList?.()}
                    className="ml-2 underline text-white/80 hover:text-white"
                  >
                    목록 보기 →
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || selectedShortIds.length === 0}
                  onClick={handleBatchRender}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#DA7756] hover:bg-[#C56545] text-white text-sm font-bold disabled:opacity-50 transition-colors shadow-lg"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>등록 중...</span></>
                  ) : (
                    <><Film className="w-4 h-4" /><span>{selectedShortIds.length}개 영상 생성</span></>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ── 설정 패널 (교회명 / 설교자 / BGM) ── */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 교회명 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#66635E] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#807D77]" />
                <span>교회 / 채널 이름</span>
              </label>
              <input
                type="text"
                value={churchName}
                onChange={e => setChurchName(e.target.value)}
                placeholder="예: 오륜교회 예배공동체"
                className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756]"
              />
            </div>

            {/* 설교자 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#66635E] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#807D77]" />
                <span>설교자</span>
              </label>
              <input
                type="text"
                value={preacher}
                onChange={e => setPreacher(e.target.value)}
                placeholder="예: 김은호 목사"
                className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756]"
              />
            </div>

            {/* BGM */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#66635E] flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#807D77]" />
                <span>배경음악 (BGM)</span>
              </label>
              <select
                value={bgm}
                onChange={e => setBgm(e.target.value)}
                className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756]"
              >
                {bgmList.map(item => (
                  <option key={item.id} value={item.id}>{item.name} — {item.desc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── 플랫폼 선택 ── */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-3">
            <h3 className="text-xs font-bold text-[#282622] flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Video className="w-3.5 h-3.5 text-[#DA7756]" />
              <span>플랫폼 선택</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'youtube', label: '유튜브용', sub: 'Shorts 9:16', Icon: YoutubeIcon },
                { id: 'instagram', label: '인스타용', sub: 'Reels 9:16', Icon: InstagramIcon },
              ].map(({ id, label, sub, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlatform(id)}
                  className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-center gap-2.5 ${
                    platform === id
                      ? 'border-[#DA7756] bg-[#FAF9F5] text-[#282622]'
                      : 'border-[#EAE8E1] bg-white text-[#66635E] hover:border-[#DCD9CF]'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${platform === id ? 'bg-[#DA7756] text-white' : 'bg-[#F2EFE8] text-[#807D77]'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">{label}</div>
                    <div className="text-[10px] font-mono text-[#807D77]">({sub})</div>
                  </div>
                  {platform === id && <Check className="w-4 h-4 text-[#DA7756] ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* ── 템플릿 선택 (접기/펼치기) ── */}
          <div className="bg-white rounded-2xl border border-[#EAE8E1] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full p-5 flex items-center justify-between hover:bg-[#FAF9F5] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-3.5 h-3.5 text-[#DA7756]" />
                <span className="text-xs font-bold text-[#282622] uppercase tracking-wider font-mono">템플릿 선택</span>
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#EFECE3] text-[#66635E] font-semibold">
                  {selectedTemplate?.name || '블랙 미니멀'}
                </span>
              </div>
              {showTemplates
                ? <ChevronUp className="w-4 h-4 text-[#807D77]" />
                : <ChevronDown className="w-4 h-4 text-[#807D77]" />}
            </button>

            {showTemplates && (
              <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border-t border-[#EAE8E1] pt-4">
                {templateList.map(tpl => {
                  const isSelected = template === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setTemplate(tpl.id)}
                      className={`group cursor-pointer rounded-2xl p-2.5 border-2 transition-all flex flex-col items-center gap-2.5 relative select-none ${
                        isSelected ? 'border-[#DA7756] bg-[#FAF9F5]' : 'border-[#EAE8E1] bg-white hover:border-[#DCD9CF]'
                      }`}
                    >
                      <div className={`w-full aspect-[9/15] rounded-xl ${tpl.previewBg} p-2 flex flex-col justify-between items-center relative overflow-hidden shadow-inner border border-black/10`}>
                        {tpl.isCinema && (
                          <img
                            src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=300&auto=format&fit=crop&q=80"
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                          />
                        )}
                        <div className="relative z-10 w-full text-center space-y-1 pt-0.5">
                          <div className={`w-3/4 h-1.5 mx-auto rounded-full ${tpl.header1}`} />
                          <div className={`w-1/2 h-1.5 mx-auto rounded-full ${tpl.header2}`} />
                        </div>
                        {tpl.videoBox ? (
                          <div className={`relative z-10 w-full aspect-video rounded-lg ${tpl.videoBox} border flex items-center justify-center`}>
                            <Play className="w-2.5 h-2.5 fill-white/80 text-white/80" />
                          </div>
                        ) : (
                          <div className="relative z-10 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                            <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
                          </div>
                        )}
                        <div className="relative z-10 w-full text-center space-y-1 pb-0.5">
                          <div className={`w-4/5 h-1.5 mx-auto rounded-full ${tpl.subtitle}`} />
                          <span className={`text-[8px] font-bold block ${tpl.crossColor}`}>✝</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold truncate block ${isSelected ? 'text-[#DA7756]' : 'text-[#282622]'}`}>
                        {tpl.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#DA7756] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 하이라이트 쇼츠 선택 ── */}
          <div className="space-y-4">
            {/* 컨트롤 바 */}
            <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#66635E] hover:text-[#282622]"
                >
                  {selectedShortIds.length === displayedShorts.length
                    ? <CheckSquare className="w-4 h-4 text-[#DA7756]" />
                    : <Square className="w-4 h-4 text-[#DCD9CF]" />}
                  <span>전체 선택 ({selectedShortIds.length}/{displayedShorts.length})</span>
                </button>
                <span className="text-[#DCD9CF]">|</span>
                <span className="text-xs font-bold text-[#282622] font-mono">AI 선정 하이라이트 {displayedShorts.length}개</span>
              </div>

              {/* 경고: URL 없을 때 */}
              {!youtubeUrl && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>유튜브 URL이 없으면 실제 영상을 다운로드할 수 없습니다</span>
                </div>
              )}
            </div>

            {/* 쇼츠 카드 그리드 */}
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

          {/* ── 하단 고정 영상 생성 버튼 (리마인더) ── */}
          {!showCreatedNotice && selectedShortIds.length > 0 && (
            <div className="sticky bottom-4 flex justify-center z-20">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleBatchRender}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#DA7756] hover:bg-[#C56545] text-white text-sm font-bold shadow-2xl disabled:opacity-60 transition-all hover:scale-105 active:scale-95"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>렌더링 큐 등록 중...</span></>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>선택한 {selectedShortIds.length}개 쇼츠 영상 생성</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* 자막 편집 모달 */}
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
