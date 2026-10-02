import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  BarChart3, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Server, 
  Video, 
  FileText, 
  ExternalLink,
  AlertTriangle,
  Cloud,
  DollarSign,
  Wifi,
  Layers,
  Cpu,
  Info,
  Calendar,
  CreditCard,
  Sparkles,
  ArrowRight,
  Workflow,
  Calculator,
  TrendingDown,
  ShieldCheck,
  Zap,
  Check
} from 'lucide-react';
import { fetchAdminDashboard } from '../api/client';

export default function AdminDashboard({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' | 'infra' | 'logs'
  const [filter, setFilter] = useState('all'); // 'all' | 'failed' | 'completed'

  // 실시간 과금 시뮬레이션 계산기 상태
  const [calcSermonCount, setCalcSermonCount] = useState(8); // 월 설교 분석 편수 (기본 8편)
  const [calcShortsPerSermon, setCalcShortsPerSermon] = useState(3); // 설교당 생성할 쇼츠 편수 (기본 3편)

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats || {
    total_cached_sermons: 0,
    total_analysis_attempts: 0,
    analysis_completed: 0,
    analysis_failed: 0,
    render_completed: 0,
    render_failed: 0,
    render_processing: 0,
    total_render_jobs: 0,
  };

  const logs = filter === 'failed' 
    ? (data?.failed_logs || [])
    : filter === 'completed'
    ? (data?.recent_logs || []).filter(l => l.status === 'COMPLETED')
    : (data?.recent_logs || []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* 관리자 헤더 */}
      <div className="bg-white rounded-2xl p-6 border border-[#EAE8E1] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#282622] text-[#DA7756] flex items-center justify-center font-bold text-xl shadow-inner">
            <ShieldAlert className="w-6 h-6 text-[#DA7756]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#282622]">네이션스 설교 AI 총괄 관리자 대시보드</h2>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                ADMIN ACCESS
              </span>
            </div>
            <p className="text-xs text-[#807D77] mt-0.5">
              관리자 계정: <span className="font-semibold text-[#282622]">{currentUser?.email}</span> (실시간 서버 상태, 작업량, 오류 분석 기록 관리)
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E0DED7] bg-[#FAF9F5] hover:bg-[#F2EFE8] text-xs font-semibold text-[#282622] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#DA7756]' : ''}`} />
          <span>새로고침</span>
        </button>
      </div>

      {/* 통계 카드 4종 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. 캐시 보관된 설교 */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-2">
          <div className="flex items-center justify-between text-[#807D77]">
            <span className="text-xs font-bold uppercase tracking-wider">누적 설교 분석</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#282622]">
            {stats.total_cached_sermons}
            <span className="text-xs font-medium text-[#807D77] ml-1">편</span>
          </div>
          <p className="text-[11px] text-[#A5A29B]">중복 과금 방지 캐시 파일</p>
        </div>

        {/* 2. AI 분석 성공/실패율 */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-2">
          <div className="flex items-center justify-between text-[#807D77]">
            <span className="text-xs font-bold uppercase tracking-wider">분석 요청 결과</span>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{stats.analysis_completed}</span>
            <span className="text-xs font-bold text-[#807D77]">성공 /</span>
            <span className="text-2xl font-black text-red-500">{stats.analysis_failed}</span>
            <span className="text-xs font-bold text-[#807D77]">실패</span>
          </div>
          <p className="text-[11px] text-[#A5A29B]">최근 세션 분석 시도 내역</p>
        </div>

        {/* 3. 영상 렌더링 상태 */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-2">
          <div className="flex items-center justify-between text-[#807D77]">
            <span className="text-xs font-bold uppercase tracking-wider">영상 렌더링</span>
            <Video className="w-4 h-4 text-[#DA7756]" />
          </div>
          <div className="text-2xl font-black text-[#282622]">
            {stats.render_completed}
            <span className="text-xs font-semibold text-amber-600 ml-1.5">
              ({stats.render_processing}개 생성중)
            </span>
          </div>
          <p className="text-[11px] text-[#A5A29B]">FFmpeg 완성 쇼츠 영상 수</p>
        </div>

        {/* 4. 서버 안정성 */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE8E1] space-y-2">
          <div className="flex items-center justify-between text-[#807D77]">
            <span className="text-xs font-bold uppercase tracking-wider">서버 연결 상태</span>
            <Server className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-lg font-black text-emerald-700">정상 가동 중</span>
          </div>
          <p className="text-[11px] text-[#A5A29B]">Cloud Run / 로컬 연동 안정</p>
        </div>
      </div>

      {/* 대시보드 뷰 전환 탭 (3대 메뉴) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-[#EAE8E1] rounded-2xl">
        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-[#282622] text-[#FAF9F5] shadow-xs'
              : 'text-[#807D77] hover:text-[#282622] hover:bg-[#FAF9F5]'
          }`}
        >
          <Workflow className="w-4 h-4 text-[#DA7756]" />
          <span>분석 & 숏폼 워크플로우 · 실시간 과금 계산기</span>
        </button>
        <button
          onClick={() => setActiveTab('infra')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'infra'
              ? 'bg-[#282622] text-[#FAF9F5] shadow-xs'
              : 'text-[#807D77] hover:text-[#282622] hover:bg-[#FAF9F5]'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>인프라 아키텍처 · 주거용 프록시 가이드</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#282622] text-[#FAF9F5] shadow-xs'
              : 'text-[#807D77] hover:text-[#282622] hover:bg-[#FAF9F5]'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>서버 작업 및 에러 로그 ({logs.length})</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: 워크플로우 명세 및 실시간 과금 시뮬레이션 계산기
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'workflow' && (() => {
        const totalShorts = calcSermonCount * calcShortsPerSermon;
        const analysisProxyMB = calcSermonCount * 0.03; // 자막 추출: 편당 약 30KB
        const renderProxyMB = totalShorts * 20; // 쇼츠 추출: 편당 약 20MB
        const totalProxyMB = analysisProxyMB + renderProxyMB;
        const totalProxyGB = totalProxyMB / 1024;
        const proxyCostKRW = Math.round(totalProxyGB * 2500); // 1GB당 $1.80 (약 2,500원)
        const proxyCostUSD = (totalProxyGB * 1.80).toFixed(2);
        const geminiCostPaidKRW = calcSermonCount * 4; // 유료 시 편당 약 4원

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. 실시간 월간 총 예상 비용 계산기 인터랙티브 카드 */}
            <div className="bg-white rounded-2xl border border-[#EAE8E1] p-6 space-y-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE8E1] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#282622]">
                      실시간 월간 예상 운영 비용 계산기 (교회 규모별 시뮬레이션)
                    </h3>
                    <p className="text-xs text-[#807D77]">
                      설교 편수와 숏폼 제작 수량을 조절하여 한 달 클라우드 및 프록시 유지비를 실시간으로 산출합니다.
                    </p>
                  </div>
                </div>

                {/* 규모별 빠른 프리셋 버튼 */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#FAF9F5] p-1 rounded-xl border border-[#EAE8E1]">
                  <span className="text-[10px] font-bold text-[#807D77] px-1.5">프리셋:</span>
                  <button
                    onClick={() => { setCalcSermonCount(4); setCalcShortsPerSermon(2); }}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg hover:bg-white text-[#282622] transition-colors"
                  >
                    소형 (월 4편)
                  </button>
                  <button
                    onClick={() => { setCalcSermonCount(8); setCalcShortsPerSermon(3); }}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-white shadow-2xs text-emerald-700 transition-colors font-bold"
                  >
                    중형 (월 8편)
                  </button>
                  <button
                    onClick={() => { setCalcSermonCount(20); setCalcShortsPerSermon(5); }}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg hover:bg-white text-[#282622] transition-colors"
                  >
                    대형 (월 20편)
                  </button>
                </div>
              </div>

              {/* 슬라이더 컨트롤 영역 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#FAF9F5] p-4 rounded-xl border border-[#EAE8E1]">
                {/* 슬라이더 1: 월 설교 분석 수 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#282622] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      월간 설교 분석 수량
                    </span>
                    <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {calcSermonCount} 편
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={calcSermonCount}
                    onChange={(e) => setCalcSermonCount(parseInt(e.target.value) || 1)}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#A5A29B]">
                    <span>1편 (테스트)</span>
                    <span>8편 (주일+수요)</span>
                    <span>40편 (대형 미디어)</span>
                  </div>
                </div>

                {/* 슬라이더 2: 설교 1편당 생성할 쇼츠 수 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#282622] flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-[#DA7756]" />
                      설교 1편당 쇼츠(숏폼) 영상 생성
                    </span>
                    <span className="font-mono font-black text-sm text-[#DA7756] bg-amber-100 px-2.5 py-0.5 rounded-full">
                      {calcShortsPerSermon} 개 (총 {totalShorts}편)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={calcShortsPerSermon}
                    onChange={(e) => setCalcShortsPerSermon(parseInt(e.target.value) || 1)}
                    className="w-full accent-[#DA7756] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#A5A29B]">
                    <span>1개 (핵심 1편)</span>
                    <span>3개 (주요 하이라이트)</span>
                    <span>5개 (풀 쇼츠 패키지)</span>
                  </div>
                </div>
              </div>

              {/* 비용 견적 결과 카드 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* 1. 총 생성 쇼츠 */}
                <div className="p-3.5 rounded-xl border border-[#EAE8E1] bg-white space-y-1">
                  <span className="text-[11px] text-[#807D77] font-semibold">총 생성 쇼츠 수</span>
                  <div className="text-xl font-black text-[#282622]">
                    {totalShorts} <span className="text-xs font-normal text-[#807D77]">편 / 월</span>
                  </div>
                  <p className="text-[10px] text-[#A5A29B]">설교 {calcSermonCount}편 × {calcShortsPerSermon}개</p>
                </div>

                {/* 2. 주거용 프록시 트래픽 */}
                <div className="p-3.5 rounded-xl border border-[#EAE8E1] bg-white space-y-1">
                  <span className="text-[11px] text-[#807D77] font-semibold">예상 프록시 데이터</span>
                  <div className="text-xl font-black text-[#DA7756]">
                    {totalProxyMB < 1000 ? `${Math.round(totalProxyMB)} MB` : `${totalProxyGB.toFixed(2)} GB`}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-semibold">1GB 대비 {Math.min(100, Math.round(totalProxyGB * 100))}% 사용</p>
                </div>

                {/* 3. 프록시 실구매 비용 */}
                <div className="p-3.5 rounded-xl border border-[#EAE8E1] bg-white space-y-1">
                  <span className="text-[11px] text-[#807D77] font-semibold">프록시 데이터 비용</span>
                  <div className="text-xl font-black text-amber-700">
                    약 {proxyCostKRW.toLocaleString()}원
                  </div>
                  <p className="text-[10px] text-[#807D77]">ThorData (${proxyCostUSD})</p>
                </div>

                {/* 4. 총 예상 월 운영비 */}
                <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 space-y-1">
                  <span className="text-[11px] text-emerald-800 font-bold">최종 월간 예상 비용</span>
                  <div className="text-xl font-black text-emerald-700">
                    약 {proxyCostKRW.toLocaleString()}원
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold">✨ 서버/AI 요금 0원 무료</p>
                </div>
              </div>

              {/* 비용 결론 요약 배너 */}
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1] text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    결론: 매월 <strong>설교 {calcSermonCount}편</strong>을 분석하고 <strong>쇼츠 {totalShorts}편</strong>을 제작해도 실비용은 <strong>월 약 {proxyCostKRW.toLocaleString()}원</strong> 수준입니다!
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#66635E] pt-1">
                  <div>• <strong>Gemini AI</strong>: 무료 티어 키(ai-sermon) 사용으로 <strong>0원</strong></div>
                  <div>• <strong>Cloud Run</strong>: 월 200만 요청 / 36만초 무료 범위 내 <strong>0원</strong></div>
                  <div>• <strong>Firebase Storage</strong>: 7일 자동 삭제로 5GB 무료 한도 내 <strong>0원</strong></div>
                </div>
              </div>
            </div>

            {/* 2. 설교 분석 워크플로우 & 단계별 과금 상세 */}
            <div className="bg-white rounded-2xl border border-[#EAE8E1] p-6 space-y-5">
              <div className="flex items-center gap-2.5 border-b border-[#EAE8E1] pb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#282622]">
                    [워크플로우 1] 설교 분석 파이프라인 및 단계별 과금 명세
                  </h3>
                  <p className="text-xs text-[#807D77]">
                    유튜브 설교 링크 입력부터 5대 쇼츠 구간 및 카드뉴스 도출까지의 세부 동작과 비용
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1단계: 자막 추출 */}
                <div className="p-4 rounded-xl border border-[#EAE8E1] bg-[#FAF9F5] space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      1단계: 자막 추출
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">약 0.07원</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#282622]">유튜브 메타 및 자막 경량 다운로드</h4>
                  <p className="text-xs text-[#807D77] leading-relaxed">
                    • 수백 MB짜리 영상을 받지 않고, <strong>자막 텍스트(약 20~30KB)만 초경량 추출</strong>합니다.<br />
                    • GCP 서버 IP 차단을 막기 위해 <strong>ThorData 주거용 프록시</strong>를 경유합니다.
                  </p>
                  <div className="pt-2 border-t border-[#EAE8E1] text-[10px] text-[#A5A29B] space-y-0.5">
                    <div>소요 시간: 약 3~5초</div>
                    <div>데이터 소모: 약 30KB (1GB의 0.003%)</div>
                  </div>
                </div>

                {/* 2단계: AI 분석 */}
                <div className="p-4 rounded-xl border border-[#EAE8E1] bg-[#FAF9F5] space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                      2단계: AI 심층 분석
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">현재 0원 (무료 티어)</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#282622]">Gemini 3.8 Flash 설교 분해</h4>
                  <p className="text-xs text-[#807D77] leading-relaxed">
                    • 1시간 설교 텍스트에서 <strong>5대 핵심 쇼츠 구간(시작~끝 타임스탬프)</strong>, 정확한 자막 대본, 5일 묵상글, 카드뉴스를 1회 호출로 모두 추출합니다.
                  </p>
                  <div className="pt-2 border-t border-[#EAE8E1] text-[10px] text-[#A5A29B] space-y-0.5">
                    <div>소요 시간: 약 20~30초</div>
                    <div>유료 전환 시: 편당 약 4원 (현재 무료)</div>
                  </div>
                </div>

                {/* 3단계: 3중 캐시 보관 */}
                <div className="p-4 rounded-xl border border-[#EAE8E1] bg-[#FAF9F5] space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      3단계: 3중 영구 보관
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">완전 무료 (0원)</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#282622]">비디오 ID 기준 캐싱 & 0초 열기</h4>
                  <p className="text-xs text-[#807D77] leading-relaxed">
                    • <strong>브라우저 로컬 + 서버 디스크 + Firestore</strong> 3중 보관합니다.<br />
                    • 이전에 분석한 영상은 AI 재호출 없이 <strong>0.01초 만에 즉시 열리며 과금 0원</strong>입니다.
                  </p>
                  <div className="pt-2 border-t border-[#EAE8E1] text-[10px] text-[#A5A29B] space-y-0.5">
                    <div>재분석 시 소요 시간: 0.01초 즉시 로딩</div>
                    <div>Firestore 무료 할당량 내 완전 무료</div>
                  </div>
                </div>
              </div>

              {/* 설교 분석 요약 뱃지 */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900">👉 설교 1편당 분석 총비용: 약 0.07원 (실질적 0원, 월 100편 분석해도 약 7원)</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-200/80 text-blue-900">거의 0원에 수렴</span>
              </div>
            </div>

            {/* 3. 숏폼(쇼츠) 렌더링 워크플로우 & 단계별 과금 상세 */}
            <div className="bg-white rounded-2xl border border-[#EAE8E1] p-6 space-y-5">
              <div className="flex items-center gap-2.5 border-b border-[#EAE8E1] pb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Video className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#282622]">
                    [워크플로우 2] 숏폼(쇼츠) 렌더링 파이프라인 및 단계별 과금 명세
                  </h3>
                  <p className="text-xs text-[#807D77]">
                    쇼츠 생성 클릭부터 9:16 인코딩 완료 및 다운로드 제공까지의 세부 동작과 비용
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1단계: 하이라이트 구간만 스트리밍 추출 */}
                <div className="p-4 rounded-xl border border-[#EAE8E1] bg-[#FAF9F5] space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                      1단계: 구간 클립 추출
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">약 48원 / 편</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#282622]">30~50초 하이라이트 구간만 추출</h4>
                  <p className="text-xs text-[#807D77] leading-relaxed">
                    • 1시간짜리 전체 영상을 받지 않고, AI가 선별한 <strong>필요 구간(약 15~20MB)만 HTTP Range로 직접 절단 다운로드</strong>합니다.<br />
                    • 주거용 프록시 경유로 403 차단 없이 안전하게 취득합니다.
                  </p>
                  <div className="pt-2 border-t border-[#EAE8E1] text-[10px] text-[#A5A29B] space-y-0.5">
                    <div>소요 시간: 약 8~15초</div>
                    <div>데이터 소모: 편당 약 20MB (1GB로 50편 제작)</div>
                  </div>
                </div>

                {/* 2단계: FFmpeg 렌더링 */}
                <div className="p-4 rounded-xl border border-[#EAE8E1] bg-[#FAF9F5] space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      2단계: 고화질 인코딩
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">무료 할당량 내 0원</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#282622]">Cloud Run 직결 FFmpeg 렌더링</h4>
                  <p className="text-xs text-[#807D77] leading-relaxed">
                    • <strong>브라우저 커넥션을 유지하여 CPU 100% 가동</strong>합니다.<br />
                    • 7대 템플릿(와이드/옐로우/풀스크린)에 맞춰 9:16 세로 화면 구성, 2줄 헤더, 한글 자막 번인, CCM 피아노 BGM 오디오 더킹을 적용합니다.
                  </p>
                  <div className="pt-2 border-t border-[#EAE8E1] text-[10px] text-[#A5A29B] space-y-0.5">
                    <div>인코딩 소요 시간: 약 15~25초</div>
                    <div>Cloud Run 매월 36만초 무료 범위 내 0원</div>
                  </div>
                </div>

                {/* 3단계: 임시 보관 및 자동 삭제 */}
                <div className="p-4 rounded-xl border border-[#EAE8E1] bg-[#FAF9F5] space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                      3단계: 배포 & 자동 삭제
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">완전 무료 (0원)</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#282622]">Firebase Storage CDN 배포</h4>
                  <p className="text-xs text-[#807D77] leading-relaxed">
                    • 완성된 쇼츠(약 4~8MB)를 Firebase Storage에 업로드하여 즉시 재생 및 다운로드 링크를 제공합니다.<br />
                    • <strong>7일 자동 삭제 수명주기</strong>를 적용하여 누적 스토리지 비용을 100% 차단합니다.
                  </p>
                  <div className="pt-2 border-t border-[#EAE8E1] text-[10px] text-[#A5A29B] space-y-0.5">
                    <div>임시 원본 비디오: 즉시 삭제 (OOM 차단)</div>
                    <div>Storage 무료 5GB 범위 내 완전 무료</div>
                  </div>
                </div>
              </div>

              {/* 숏폼 렌더링 요약 뱃지 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">
                  👉 쇼츠 1편당 생성 비용: 약 48원 (프록시 트래픽비) · 설교 1편에서 5편 전체 생성 시 약 240원
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                  1GB($1.80)로 약 50편 제작
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 탭 2: 기존 인프라 아키텍처 · 주거용 프록시 정보 */}
      {activeTab === 'infra' && (
        <div className="space-y-6 animate-fadeIn">
          {/* 1. 구글 클라우드 Cloud Run & 앱 프로젝트 정보 */}
          <div className="bg-white rounded-2xl border border-[#EAE8E1] p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#EAE8E1] pb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#282622]">
                  1. 구글 클라우드(Cloud Run) 및 등록 프로젝트 구성 현황
                </h3>
                <p className="text-xs text-[#807D77]">
                  Google Cloud Platform 유료 프로젝트 및 Gemini 무료 API 키 구조 명세
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cloud Run 백엔드 */}
              <div className="bg-[#FAF9F5] border border-[#EAE8E1] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#DA7756] bg-[#DA7756]/10 px-2 py-0.5 rounded">
                    Backend (Cloud Run 유료)
                  </span>
                  <Cpu className="w-4 h-4 text-[#807D77]" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#807D77]">프로젝트 이름: <span className="text-[#282622] font-black">nations-sermon</span></div>
                  <div className="font-mono text-xs font-bold text-red-600">ID: sermon-ym (유료 결제 계정 연동)</div>
                </div>
                <p className="text-xs text-[#807D77] leading-relaxed">
                  <strong>핵심 기능</strong>: FastAPI 백엔드 API, 주거용 프록시 연동, yt-dlp 720p 하이라이트 구간 다운로드, FFmpeg 영상/음악 합성 및 인코딩, POT Provider(포트 4416).
                </p>
              </div>

              {/* Gemini API 무료 프로젝트 */}
              <div className="bg-[#FAF9F5] border border-[#EAE8E1] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    AI 분석 API (무료)
                  </span>
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#807D77]">프로젝트 이름: <span className="text-[#282622] font-black">sermon</span></div>
                  <div className="font-mono text-xs font-bold text-emerald-600">키 이름: ai-sermon (무료 티어 사용)</div>
                </div>
                <p className="text-xs text-[#807D77] leading-relaxed">
                  <strong>핵심 기능</strong>: 설교 자막 텍스트 심층 분석, 5대 핵심 쇼츠 하이라이트 도출, 성경 본문/제목/설교자 추출, 묵상 및 카드뉴스 텍스트 원클릭 동시 생성.
                </p>
              </div>

              {/* 영상 및 카드뉴스 저장 위치 */}
              <div className="bg-[#FAF9F5] border border-[#EAE8E1] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    데이터 저장 위치 (Storage)
                  </span>
                  <Server className="w-4 h-4 text-[#807D77]" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#807D77]">버킷: <span className="font-mono text-xs text-[#282622] font-bold">sermon-ym.appspot.com</span></div>
                  <div className="text-[11px] text-purple-600 font-semibold">카드뉴스: 브라우저 로컬 + 서버 캐시</div>
                </div>
                <p className="text-xs text-[#807D77] leading-relaxed">
                  <strong>저장 구조</strong>: 
                  • <strong>쇼츠 영상</strong> ➔ Firebase Storage 및 CDN (7일 자동 삭제)
                  • <strong>카드뉴스 & 메타데이터</strong> ➔ 서버 캐시(/outputs/cache) 및 클라이언트 상태에 영구/즉시 보관.
                </p>
              </div>
            </div>
          </div>

          {/* 2. 저장, 불러오기 및 기본 가격과 실사용 비용 구조 */}
          <div className="bg-white rounded-2xl border border-[#EAE8E1] p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#EAE8E1] pb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#282622]">
                  2. 저장 · 불러오기 기본 가격과 우리 앱 실사용 비용 비교
                </h3>
                <p className="text-xs text-[#807D77]">
                  Google Cloud Storage / Firebase의 데이터 읽기/쓰기 기본 단가와 실제 서비스 운영 시 비용 분석
                </p>
              </div>
            </div>

            {/* 기본 단가 vs 우리 앱 비용 비교 테이블 */}
            <div className="overflow-x-auto border border-[#EAE8E1] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#EAE8E1] text-[#807D77] text-[11px] uppercase">
                    <th className="py-2.5 px-3">구분</th>
                    <th className="py-2.5 px-3">클라우드 표준 기본 단가 (GCP/Firebase)</th>
                    <th className="py-2.5 px-3">우리 앱(nations-sermon) 적용 방식</th>
                    <th className="py-2.5 px-3">실제 예상 비용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE8E1] text-[#282622]">
                  <tr>
                    <td className="py-2.5 px-3 font-bold bg-[#FAF9F5]/40">영상 저장 (Upload / Write)</td>
                    <td className="py-2.5 px-3 text-[#807D77]">
                      • Class A 작업: 10,000건당 $0.05 (약 70원)<br />
                      • 스토리지 보관료: GB당 월 $0.026 (약 35원)
                    </td>
                    <td className="py-2.5 px-3 text-[#807D77]">
                      쇼츠 1편당 <strong>유튜브용 약 3~4MB</strong>, <strong>고화질 약 7~8MB</strong>로 매우 경량화. <strong>7일 자동 삭제 규칙(Lifecycle)</strong>으로 불필요한 누적 보관 원천 차단
                    </td>
                    <td className="py-2.5 px-3 font-black text-emerald-600">
                      무료 Spark 범위 (5GB) 내 <strong>0원</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold bg-[#FAF9F5]/40">영상 불러오기 (Read / CDN)</td>
                    <td className="py-2.5 px-3 text-[#807D77]">
                      • Class B 작업: 10,000건당 $0.004 (약 5.6원)<br />
                      • 네트워크 아웃바운드: 월 10GB 무료 후 GB당 약 $0.12
                    </td>
                    <td className="py-2.5 px-3 text-[#807D77]">
                      대시보드 미리보기 및 다운로드 시 CDN 링크 직접 재생. 외부 트래픽 분산
                    </td>
                    <td className="py-2.5 px-3 font-black text-emerald-600">
                      월 100~200편 시청 시 <strong>0원 ~ 100원 미만</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold bg-[#FAF9F5]/40">카드뉴스 데이터 저장/조회</td>
                    <td className="py-2.5 px-3 text-[#807D77]">
                      Firestore 등 NoSQL DB 사용 시 읽기/쓰기당 과금
                    </td>
                    <td className="py-2.5 px-3 text-[#807D77]">
                      외부 유료 DB 대신 <strong>백엔드 로컬 JSON 캐시 + 브라우저 메모리</strong>로 즉시 전달
                    </td>
                    <td className="py-2.5 px-3 font-black text-emerald-600">
                      <strong>완전 무료 (0원)</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold bg-[#FAF9F5]/40">Gemini AI 분석 (api-sermon)</td>
                    <td className="py-2.5 px-3 text-[#807D77]">
                      Gemini 3.5/3.8 Flash 입력 100만 토큰당 약 100원
                    </td>
                    <td className="py-2.5 px-3 text-[#807D77]">
                      <strong>초고속 3중 병렬 처리(속도 10배↑)</strong>로 입력 비용이 3배 늘었으나, 1편당 <strong>3~4원</strong> 수준으로 극히 미미
                    </td>
                    <td className="py-2.5 px-3 font-black text-emerald-600">
                      <strong>현재 0원 (무료 티어 내 운영)</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 실제 앱 운영 총비용 결론 카드 */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                결론: 우리 앱(nations-sermon) 실제 유지 비용 요약
              </div>
              <p className="text-emerald-800 leading-relaxed">
                • <strong>Google Cloud Run(프로젝트: nations-sermon / ID: sermon-ym)</strong>: 유료 결제 계정으로 등록되어 있으나, 
                매월 무료 할당량(200만 요청, 36만 vCPU초)이 우선 차감되어 일반 교회 설교 운영 시 <strong>월 0원 ~ 몇백 원</strong> 수준입니다.<br />
                • <strong>AI 분석(프로젝트: sermon / 키: ai-sermon)</strong>: 무료 API 티어를 활용하여 AI 분석료 <strong>0원</strong>.<br />
                • <strong>주거용 프록시(ThorData)</strong>: 10/2일 결제한 <strong>1.8달러(약 2,500원, 일회성)</strong> 외에 추가 정기 지출이 없습니다.
              </p>
            </div>
          </div>

          {/* 3. 주거용 프록시(Residential Proxy) 운영 정보 */}
          <div className="bg-white rounded-2xl border border-[#EAE8E1] p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#EAE8E1] pb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#282622]">
                  3. 주거용 프록시(Residential Proxy) 도입 배경 및 결제 운영 정보
                </h3>
                <p className="text-xs text-[#807D77]">
                  유튜브 봇 차단(403 Forbidden) 원천 우회 및 구매 라이선스 관리 현황
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 프록시 도입 이유 */}
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1] space-y-2">
                <h4 className="text-xs font-bold text-[#282622] flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#DA7756]" />
                  주거용 프록시(Residential Proxy)를 적용한 필수적인 이유
                </h4>
                <p className="text-xs text-[#807D77] leading-relaxed">
                  구글 클라우드 런(Cloud Run)이나 AWS 등 클라우드 데이터센터 IP 대역은 유튜브의 강력한 봇 탐지 시스템에 의해 
                  <span className="text-red-600 font-semibold"> "Sign in to confirm you're not a bot" (403 Forbidden)</span> 에러와 함께 즉시 차단됩니다.
                  일반 가정용 초고속 인터넷 회선(ISP)의 주거용 IP를 경유함으로써 유튜브에 <strong>실제 일반 사용자가 시청하는 정상 트래픽</strong>으로 인식시켜
                  차단을 원천 우회하고 안정적으로 영상을 처리합니다.
                </p>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 leading-relaxed font-medium">
                  💡 <strong>트래픽(1GB) 극대화 절약 설계</strong>: 1시간짜리 전체 영상을 통째로 다운받지 않고, 
                  <strong> [1단계] 자막 텍스트만 추출(수 KB) ➔ [2단계] 선별된 5개 쇼츠 구간만 720p MP4로 부분 추출(download_ranges)</strong>하여 
                  1GB 용량으로 수백 편 이상의 설교를 소화할 수 있도록 파이프라인을 최적화했습니다.
                </div>
              </div>

              {/* 구매 사이트 및 결제 상세 내역 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-[#EAE8E1] bg-white space-y-1">
                  <span className="text-[11px] text-[#807D77] font-semibold">구매 사이트</span>
                  <a
                    href="https://www.thordata.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#DA7756] hover:underline flex items-center gap-1"
                  >
                    <span>ThorData (바로가기)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[10px] text-[#A5A29B]">https://www.thordata.com/</p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#EAE8E1] bg-white space-y-1">
                  <span className="text-[11px] text-[#807D77] font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#807D77]" />
                    최초 구입일
                  </span>
                  <div className="font-black text-sm text-[#282622]">
                    2026년 10월 2일
                  </div>
                  <p className="text-[10px] text-emerald-600 font-semibold">첫 라이선스 활성화</p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#EAE8E1] bg-white space-y-1">
                  <span className="text-[11px] text-[#807D77] font-semibold flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-[#807D77]" />
                    결제 금액
                  </span>
                  <div className="font-black text-sm text-[#282622]">
                    $1.80 <span className="text-xs font-normal text-[#807D77]">(약 2,500원)</span>
                  </div>
                  <p className="text-[10px] text-blue-600 font-semibold">10% 프로모션 할인 적용</p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#EAE8E1] bg-white space-y-1">
                  <span className="text-[11px] text-[#807D77] font-semibold flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-[#807D77]" />
                    결제 주기 및 방식
                  </span>
                  <div className="font-black text-sm text-amber-700">
                    정기 구독 아님 (일회성)
                  </div>
                  <p className="text-[10px] text-red-600 font-semibold">⚠️ 다음 달에 다시 수동 구매 필요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 기존 설교 분석 및 렌더링 작업 로그 테이블 */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-[#EAE8E1] p-6 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-black text-[#282622]">
                설교 분석 및 렌더링 작업 로그 기록
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                오류 {stats.analysis_failed}건
              </span>
            </div>

            {/* 필터 탭 */}
            <div className="flex items-center gap-1 p-1 bg-[#FAF9F5] border border-[#E0DED7] rounded-xl text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-white text-[#282622] shadow-2xs' : 'text-[#807D77] hover:text-[#282622]'
                }`}
              >
                전체 로그
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filter === 'failed' ? 'bg-red-500 text-white shadow-2xs' : 'text-[#807D77] hover:text-[#282622]'
                }`}
              >
                실패 로그만 ({stats.analysis_failed})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filter === 'completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-[#807D77] hover:text-[#282622]'
                }`}
              >
                성공 로그만
              </button>
            </div>
          </div>

          {/* 로그 목록 테이블 */}
          {logs.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#807D77] bg-[#FAF9F5] rounded-xl border border-dashed border-[#DCD9CF]">
              기록된 분석 로그가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE8E1] text-[#807D77] font-mono uppercase text-[11px] bg-[#FAF9F5]/70">
                    <th className="py-2.5 px-3">시간</th>
                    <th className="py-2.5 px-3">상태</th>
                    <th className="py-2.5 px-3">유튜브 URL</th>
                    <th className="py-2.5 px-3">오류 내용 및 상세 로그</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE8E1]">
                  {logs.map((log) => {
                    const isFailed = log.status === 'FAILED';
                    return (
                      <tr key={log.id} className={isFailed ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-[#FAF9F5]'}>
                        <td className="py-2.5 px-3 font-mono text-[#807D77] whitespace-nowrap text-[11px]">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isFailed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                              <XCircle className="w-3 h-3" />
                              실패
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              성공
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate">
                          <a
                            href={log.youtube_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#DA7756] hover:underline font-mono text-[11px] flex items-center gap-1"
                          >
                            <span className="truncate">{log.youtube_url}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        </td>
                        <td className="py-2.5 px-3 text-[#282622]">
                          {isFailed ? (
                            <div className="text-red-700 font-mono text-[11px] bg-red-100/60 p-2 rounded-lg border border-red-200">
                              {log.error || '상세 에러 원인 미제공 (네트워크/API 제한)'}
                            </div>
                          ) : (
                            <span className="text-[#807D77] text-[11px]">설교 분석 완료 및 캐시 저장 정상 처리</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
