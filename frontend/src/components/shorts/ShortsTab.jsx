import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Building2,
  Play,
  Pause,
  Volume2,
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
import TitleEditModal from './TitleEditModal';
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
  const [bgm, setBgm] = useState('calm_piano.mp3');
  const [bgmList, setBgmList] = useState([]);
  const [previewingBgm, setPreviewingBgm] = useState(null);
  const audioPlayerRef = useRef(null);

  const togglePreviewBgm = (bgmId) => {
    if (!bgmId || bgmId === 'none') {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPreviewingBgm(null);
      return;
    }

    if (previewingBgm === bgmId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPreviewingBgm(null);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
        audioPlayerRef.current.onended = () => setPreviewingBgm(null);
      }
      audioPlayerRef.current.src = `http://127.0.0.1:8000/api/assets/bgm-audio/${bgmId}`;
      audioPlayerRef.current.volume = 0.8;
      audioPlayerRef.current.play().catch(e => console.warn('오디오 재생 실패:', e));
      setPreviewingBgm(bgmId);
    }
  };

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

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

  // ── 7대 템플릿 정의 (순서: 와이드 -> 블루 와이드 -> 옐로우 와이드 -> 투명 미니멀 -> 블랙 미니멀 -> 옐로우 미니멀 -> 풀스크린)
  const templateList = [
    {
      id: 'cinema_letterbox', name: '와이드',
      bgType: 'wide', bgColor: 'bg-[#0B0C0E]',
      qColor: 'text-white', aColor: 'text-[#FFE600]',
      padTop: 'pt-2',
    },
    {
      id: 'blue_wide', name: '블루 와이드',
      bgType: 'wide', bgColor: 'bg-[#1E62D0]',
      qColor: 'text-white', aColor: 'text-[#FFE600]',
      padTop: 'pt-2',
    },
    {
      id: 'yellow_wide', name: '옐로우 와이드',
      bgType: 'wide', bgColor: 'bg-[#F4CF42]',
      qColor: 'text-[#121212]', aColor: 'text-[#181A22]',
      padTop: 'pt-2',
    },
    {
      id: 'transparent_minimal', name: '투명 미니멀',
      bgType: 'transparent', bgColor: 'bg-black/60',
      qColor: 'text-white', aColor: 'text-[#FFE600]',
      padTop: 'pt-1.5',
    },
    {
      id: 'dark_minimal', name: '블랙 미니멀',
      bgType: 'minimal', bgColor: 'bg-[#0E0E10]',
      qColor: 'text-white', aColor: 'text-[#FFE600]',
      padTop: 'pt-1.5',
    },
    {
      id: 'yellow_minimal', name: '옐로우 미니멀',
      bgType: 'minimal', bgColor: 'bg-[#F4CF42]',
      qColor: 'text-[#121212]', aColor: 'text-[#181A22]',
      padTop: 'pt-1.5',
    },
    {
      id: 'full_cinema', name: '풀스크린',
      bgType: 'fullscreen', bgColor: 'bg-black',
      qColor: 'text-white', aColor: 'text-[#FFE600]',
      padTop: 'pt-1.5',
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#66635E] flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-[#807D77]" />
                  <span>배경음악 (BGM)</span>
                </label>

                {bgm && bgm !== 'none' && (
                  <button
                    type="button"
                    onClick={() => togglePreviewBgm(bgm)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                      previewingBgm === bgm
                        ? 'bg-[#DA7756] text-white animate-pulse'
                        : 'bg-[#EFECE3] text-[#66635E] hover:text-[#282622] hover:bg-[#E5E0D5]'
                    }`}
                    title="선택된 BGM 미리듣기"
                  >
                    {previewingBgm === bgm ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>정지</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>미리듣기</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bgm}
                  onChange={e => {
                    const newBgm = e.target.value;
                    setBgm(newBgm);
                    if (previewingBgm) {
                      togglePreviewBgm(newBgm);
                    }
                  }}
                  className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756]"
                >
                  {bgmList.map(item => (
                    <option key={item.id} value={item.id}>{item.name} — {item.desc}</option>
                  ))}
                </select>
              </div>
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
              <div className="px-3 sm:px-5 pb-5 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 border-t border-[#EAE8E1] pt-4">
                {templateList.map(tpl => {
                  const isSelected = template === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setTemplate(tpl.id)}
                      className={`group cursor-pointer rounded-xl p-1.5 sm:p-2 border-2 transition-all flex flex-col items-center gap-1.5 sm:gap-2 relative select-none ${
                        isSelected ? 'border-[#DA7756] bg-[#FAF9F5]' : 'border-[#EAE8E1] bg-white hover:border-[#DCD9CF]'
                      }`}
                    >
                      {/* 9:16 비율 실감형 미니어처 */}
                      <div className={`w-full aspect-[9/16] rounded-lg ${tpl.bgColor} p-1 sm:p-1.5 flex flex-col justify-between items-center relative overflow-hidden shadow-inner border border-black/10 text-center`}>
                        {/* 풀스크린/투명일 때 배경 비디오 이미지 */}
                        {(tpl.bgType === 'fullscreen' || tpl.bgType === 'transparent') && (
                          <img
                            src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=300&auto=format&fit=crop&q=80"
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                          />
                        )}

                        {/* 상단: 제목 & 소제목 (실제 텍스트 - 지금보다 더 아래로 이동) */}
                        <div className={`relative z-10 w-full leading-tight ${tpl.bgType === 'wide' ? 'pt-4 sm:pt-5 pb-1' : 'pt-3 sm:pt-4 pb-1'}`}>
                          <p className={`text-[7px] sm:text-[9.5px] font-black tracking-tighter truncate ${tpl.qColor}`}>
                            열심히 해도 목마른 이유
                          </p>
                          <p className={`text-[5px] sm:text-[7.5px] font-semibold truncate ${tpl.aColor} opacity-90 scale-90`}>
                            당신의 열심의 정체
                          </p>
                        </div>

                        {/* 중단: 비디오 영역
                            - 와이드 3종: 영상 크기가 위아래로 훨씬 길고(aspect-[16/15]), 위아래 배경 최소화, 자막이 영상 안 하단에 오버레이
                            - 미니멀/투명 미니멀: 중앙 가로 16:9 영상 박스 노출
                        */}
                        {tpl.bgType === 'wide' ? (
                          <div className="relative z-10 w-full aspect-[16/15] bg-black rounded overflow-hidden shadow-md my-0 flex flex-col justify-end">
                            <img
                              src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=280&auto=format&fit=crop&q=80"
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover opacity-90 scale-135"
                            />
                            {/* 영상 중앙 재생 아이콘 */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3.5 h-3.5 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-xs">
                                <Play className="w-1.5 h-1.5 fill-white text-white ml-0.5" />
                              </div>
                            </div>
                            {/* 와이드 자막: 영상 안쪽 아래에 배치 */}
                            <div className="relative z-10 w-full bg-black/95 px-1 py-0.5 border-t border-white/20 mb-1 mx-auto max-w-[92%] rounded">
                              <p className="text-[5.5px] sm:text-[7px] text-white font-medium leading-[1.15] break-keep line-clamp-2">
                                오늘 하나님이 여러분에게 주시는 말씀은 하나님께 나아오라는 것입니다.
                              </p>
                            </div>
                          </div>
                        ) : (tpl.bgType === 'minimal' || tpl.bgType === 'transparent') ? (
                          <div className="relative z-10 w-full aspect-video rounded bg-black/60 border border-white/20 flex items-center justify-center overflow-hidden my-auto shadow-sm">
                            <img
                              src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=200&auto=format&fit=crop&q=80"
                              alt=""
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute w-3.5 h-3.5 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-xs">
                              <Play className="w-1.5 h-1.5 fill-white text-white ml-0.5" />
                            </div>
                          </div>
                        ) : null}

                        {/* 하단: 자막 (미니멀/투명/풀스크린) & 교회명 - 풀스크린/미니멀 자막을 더 위로 올림 */}
                        <div className={`relative z-10 w-full space-y-1 ${tpl.bgType === 'wide' ? 'pb-0.5 pt-0.5' : 'pb-3.5'}`}>
                          {tpl.bgType !== 'wide' && (
                            <div className="w-full bg-black/95 px-1 py-1 rounded border border-white/15 shadow-sm mb-1">
                              <p className="text-[5.5px] sm:text-[7px] text-white font-medium leading-[1.15] break-keep line-clamp-2">
                                오늘 하나님이 여러분에게 주시는 말씀은 하나님께 나아오라는 것입니다.
                              </p>
                            </div>
                          )}
                          <div className="flex items-center justify-center gap-0.5 opacity-70">
                            <span className={`text-[6px] ${tpl.qColor}`}>✝</span>
                            <span className={`text-[5px] sm:text-[6px] font-bold ${tpl.qColor} truncate max-w-[50px]`}>
                              {churchName || '교회이름'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 템플릿 명칭 */}
                      <span className={`text-[10px] sm:text-xs font-bold truncate block ${isSelected ? 'text-[#DA7756]' : 'text-[#282622]'}`}>
                        {tpl.name}
                      </span>

                      {isSelected && (
                        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#DA7756] text-white flex items-center justify-center shadow">
                          <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />
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

      {/* 제목/소제목 편집 모달 (쇼츠 생성 전 단계) */}
      {editingShort && (
        <TitleEditModal
          shortItem={editingShort}
          onClose={() => setEditingShort(null)}
          onSave={(shortId, newQuestion, newAnswer) => {
            const updatedShorts = sermonData.shorts.map(s =>
              s.id === shortId
                ? {
                    ...s,
                    title_question: newQuestion,
                    title_answer: newAnswer,
                  }
                : s
            );
            setSermonData({ ...sermonData, shorts: updatedShorts });
            setEditingShort(null);
          }}
        />
      )}
    </div>
  );
}
