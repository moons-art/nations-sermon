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
  AlertTriangle
} from 'lucide-react';
import { fetchAdminDashboard } from '../api/client';

export default function AdminDashboard({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'failed' | 'completed'

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
          <p className="text-[11px] text-[#A5A29B]">포트 8000 API 서비스 안정</p>
        </div>
      </div>

      {/* 분석 실패 및 작업 로그 기록 테이블 */}
      <div className="bg-white rounded-2xl border border-[#EAE8E1] p-6 space-y-4">
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
    </div>
  );
}
