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
import { queueRenderItems, fetchBgmList, executeRenderJob, BASE_URL } from '../../api/client';

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
      audioPlayerRef.current.src = `${BASE_URL}/api/assets/bgm-audio/${bgmId}`;
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
      const effectiveYtUrl =
        youtubeUrl ||
        sermonData?.metadata?.youtube_url ||
        sermonData?.youtube_url ||
        localStorage.getItem('last_youtube_url') ||
        '';

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
        youtube_url: effectiveYtUrl,
      }));

      const queueRes = await queueRenderItems(payload);
      if (onShortsQueued) onShortsQueued();
      setShowCreatedNotice(true);

      // Cloud Run 환경에서 CPU Throttling으로 인한 멈춤을 방지하기 위해,
      // 브라우저 커넥션을 유지하며 각 작업을 순차적으로 직접 렌더링 완수
      if (queueRes?.jobs && queueRes.jobs.length > 0) {
        for (const job of queueRes.jobs) {
          try {
            await executeRenderJob(job.job_id);
          } catch (jobErr) {
            console.warn(`[쇼츠 렌더링 완료 대기 중 알림] Job ${job.job_id}:`, jobErr);
          }
        }
      }
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
          {/* ── 상단 설정 바: 교회/채널명, 설교자, 배경음악 선택 ── */}
          <div className="bg-white rounded-2xl border border-[#EAE8E1] p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 교회 / 채널명 */}
              <div>
                <label className="text-[10px] font-bold text-[#66635E] flex items-center gap-1 mb-1">
                  <Building2 className="w-3 h-3 text-[#807D77]" />
                  <span>교회 / 채널 이름</span>
                </label>
                <input
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="예: 베이직교회, 우리교회"
                  className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756] transition-colors"
                />
              </div>

              {/* 설교자 */}
              <div>
                <label className="text-[10px] font-bold text-[#66635E] flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-[#807D77]" />
                  <span>설교자 이름</span>
                </label>
                <input
                  type="text"
                  value={preacher}
                  onChange={(e) => setPreacher(e.target.value)}
                  placeholder="예: 조정민 목사"
                  className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756] transition-colors"
                />
              </div>

              {/* 배경음악 (BGM) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-[#66635E] flex items-center gap-1">
                    <Music className="w-3 h-3 text-[#807D77]" />
                    <span>배경음악 (BGM)</span>
                  </label>
                  {bgm && bgm !== 'none' && (
                    <button
                      type="button"
                      onClick={() => togglePreviewBgm(bgm)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        previewingBgm === bgm
                          ? 'bg-[#DA7756] text-white animate-pulse'
                          : 'bg-[#EFECE3] text-[#66635E] hover:text-[#282622]'
                      }`}
                    >
                      {previewingBgm === bgm ? (
                        <>
                          <Pause className="w-2.5 h-2.5" />
                          <span>정지</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>미리듣기</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <select
                  value={bgm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBgm(val);
                    if (previewingBgm) togglePreviewBgm(val);
                  }}
                  className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756] transition-colors cursor-pointer"
                >
                  {bgmList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── 템플릿 선택 (항상 작게 상시 노출, 화면 줄어들 때 커지지 않고 PC 크기 유지) ── */}
          <div className="bg-white rounded-2xl border border-[#EAE8E1] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#DA7756]" />
                <span className="text-xs font-bold text-[#282622] uppercase tracking-wider font-mono">템플릿 선택</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#EFECE3] text-[#66635E] font-semibold">
                {selectedTemplate?.name || '블랙 미니멀'}
              </span>
            </div>

            {/* 7개 템플릿: 화면이 줄어들면 너무 작아지지 않고 2줄(4열/3열)로 내려오도록 반응형 그리드 적용 */}
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {templateList.map(tpl => {
                const isSelected = template === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setTemplate(tpl.id)}
                    className={`group cursor-pointer rounded-xl p-1.5 border-2 transition-all flex flex-col items-center gap-1.5 relative select-none ${
                      isSelected ? 'border-[#DA7756] bg-[#FAF9F5]' : 'border-[#EAE8E1] bg-white hover:border-[#DCD9CF]'
                    }`}
                  >
                    {/* 9:16 비율 실감형 미니어처 */}
                    <div className={`w-full aspect-[9/16] rounded-lg ${tpl.bgColor} p-1 flex flex-col justify-between items-center relative overflow-hidden shadow-inner border border-black/10 text-center`}>
                      {(tpl.bgType === 'fullscreen' || tpl.bgType === 'transparent') && (
                        <img
                          src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=300&auto=format&fit=crop&q=80"
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-60"
                        />
                      )}

                      {/* 상단 제목 & 소제목 (3배 크기 확대, 검은 글자는 그림자 제거) */}
                      <div className={`relative z-10 w-full leading-tight px-0.5 ${tpl.bgType === 'wide' ? 'pt-2 pb-0.5' : 'pt-2 pb-0.5'}`}>
                        <p className={`text-[10px] sm:text-[11px] font-black tracking-tighter truncate ${tpl.qColor.includes('white') ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : ''} ${tpl.qColor}`}>
                          항상 목마른 여러분에게
                        </p>
                        <p className={`text-[8.5px] sm:text-[9.5px] font-extrabold truncate ${tpl.aColor.includes('white') ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : ''} ${tpl.aColor} mt-0.5`}>
                          당신의 열심의 정체
                        </p>
                      </div>

                      {tpl.bgType === 'wide' ? (
                        <div className="relative z-10 w-full aspect-[16/14] bg-black rounded overflow-hidden shadow-md my-0 flex flex-col justify-end">
                          <img
                            src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=280&auto=format&fit=crop&q=80"
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-90 scale-135"
                          />
                          {/* 와이드 내부 자막: 얇고 정돈된 외곽선 */}
                          <div className="relative z-10 w-full px-0.5 py-0.5 mb-0.5 mx-auto max-w-[95%] text-center">
                            <p className="text-[7px] sm:text-[8px] text-white font-black leading-tight break-keep line-clamp-2 [text-shadow:_-0.5px_-0.5px_0_#000,_0.5px_-0.5px_0_#000,_-0.5px_0.5px_0_#000,_0.5px_0.5px_0_#000]">
                              오늘 하나님이<br />주시는 생명의 말씀
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
                          <div className="absolute w-3 h-3 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-xs">
                            <Play className="w-1.5 h-1.5 fill-white text-white ml-0.5" />
                          </div>
                        </div>
                      ) : null}

                      {/* 하단: 자막 (검은 배경카드 제거, 얇고 깔끔한 외곽선, 2줄, 위치 1줄 위로 상향) 및 교회이름 */}
                      <div className={`relative z-10 w-full space-y-0.5 ${tpl.bgType === 'wide' ? 'pb-0.5' : 'pb-1'}`}>
                        {tpl.bgType !== 'wide' && (
                          <div className="w-full px-1 py-0.5 -mt-1 mb-0.5 text-center">
                            <p className="text-[7px] sm:text-[8px] text-white font-black leading-tight break-keep line-clamp-2 [text-shadow:_-0.5px_-0.5px_0_#000,_0.5px_-0.5px_0_#000,_-0.5px_0.5px_0_#000,_0.5px_0.5px_0_#000]">
                              오늘 하나님이<br />주시는 생명의 말씀
                            </p>
                          </div>
                        )}
                        <span className={`text-[6px] font-bold ${tpl.qColor} truncate block opacity-75`}>
                          ✝ {churchName || '교회이름'}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[9.5px] sm:text-[11px] font-bold truncate block ${isSelected ? 'text-[#DA7756]' : 'text-[#282622]'}`}>
                      {tpl.name}
                    </span>

                    {isSelected && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#DA7756] text-white flex items-center justify-center shadow">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 하이라이트 쇼츠 선택 및 상단 컨트롤 바 ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#282622] font-mono">
                  가장 감동적인 설교 하이라이트 5개
                </span>
                <span className="text-[#DCD9CF]">|</span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#66635E] hover:text-[#282622]"
                >
                  {selectedShortIds.length === displayedShorts.length
                    ? <CheckSquare className="w-4 h-4 text-[#DA7756]" />
                    : <Square className="w-4 h-4 text-[#DCD9CF]" />}
                  <span>전체선택 ({selectedShortIds.length}/{displayedShorts.length})</span>
                </button>
              </div>

              {/* 바로 옆에 위치한 [모두 영상생성] 버튼 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || selectedShortIds.length === 0}
                  onClick={handleBatchRender}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DA7756] hover:bg-[#C56545] text-white text-xs font-bold disabled:opacity-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>영상 생성 중...</span></>
                  ) : (
                    <><Film className="w-3.5 h-3.5" /><span>모두 영상생성 ({selectedShortIds.length}개)</span></>
                  )}
                </button>
              </div>
            </div>

            {/* 쇼츠 카드 그리드: 반 크기로 컴팩트하게 축소 (모바일 2열, PC 3~4열) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                  onUpdateTitles={(q, a) => {
                    const updated = sermonData.shorts.map(s =>
                      s.id === short.id ? { ...s, title_question: q, title_answer: a, title: a } : s
                    );
                    setSermonData({ ...sermonData, shorts: updated });
                  }}
                />
              ))}
            </div>
          </div>
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
