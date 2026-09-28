import React, { useState } from 'react';
import { Film, BookOpen, LayoutTemplate, Key, Sparkles, CheckCircle2 } from 'lucide-react';
import YoutubeIcon from './YoutubeIcon';

export default function Navbar({ activeTab, setActiveTab, apiKey, setApiKey }) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey || '');

  const handleSaveKey = () => {
    setApiKey(tempKey);
    setShowKeyModal(false);
  };

  const navItems = [
    { id: 'shorts', label: '쇼츠 자동 생성', icon: Film, badge: '6개 추출' },
    { id: 'meditation', label: '5일치 설교 묵상', icon: BookOpen, badge: '월~금' },
    { id: 'cardnews', label: '카드뉴스 에디터', icon: LayoutTemplate, badge: '2종류' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* 로고 & 슬로건 */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('shorts')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 bg-clip-text text-transparent">
                    설교 AI
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    스튜디오
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">유튜브 링크 하나로 완성하는 미디어 사역</p>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-sm shadow-slate-200 border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* 우측 도구: Gemini API 키 설정 & 서버 상태 */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowKeyModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  apiKey
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Gemini API 키 설정"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{apiKey ? 'Gemini 연동됨' : 'Gemini 키 설정'}</span>
                {apiKey && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              </button>
            </div>
          </div>

          {/* 모바일 탭 바 */}
          <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold ${
                    isActive ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* API Key 모달 */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Google Gemini API 키</h3>
                <p className="text-xs text-slate-500">키가 없어도 고품질 Mock 데이터로 모든 기능이 작동합니다.</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Gemini API Key (선택사항)
              </label>
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                * 키를 비워두면 기본 탑재된 은혜로운 설교 Mock 데이터셋이 로드되어 UI 및 FFmpeg 렌더링 파이프라인을 온전히 테스트할 수 있습니다.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
