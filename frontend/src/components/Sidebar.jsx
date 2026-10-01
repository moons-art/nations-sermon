import React from 'react';
import {
  UploadCloud,
  Film,
  ListVideo,
  LayoutTemplate,
  Layers,
  BookOpen,
  ShieldCheck,
  LogOut,
  LogIn,
  Settings,
  Sparkles,
  CreditCard,
  HardDrive,
  Copy,
  Search,
  FileEdit,
  EyeOff,
} from 'lucide-react';

// 네이션스 바이블 특유의 심플한 분할 패널 아이콘 (SVG)
function SidebarPanelIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

// 네이션스 4각 스파클 아이콘
function NationsSparkleIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

export default function Sidebar({
  isOpen = false,
  onClose,
  activeTab,
  setActiveTab,
  currentSermonTitle,
  shortsNotice,
  cardNotice,
  analysisState,
  currentUser,
  userLoading,
  onOpenLogin,
  onOpenPricing,
  onLogout,
}) {
  // 관리자 판별 (ymoonsik 계정)
  const isAdmin = currentUser?.email && (
    currentUser.email.toLowerCase().includes('ymoonsik@gmail') ||
    currentUser.email.toLowerCase().startsWith('ymoonsik')
  );

  const mainNavItems = [
    {
      id: 'upload',
      label: '나의 설교 업로드',
      icon: UploadCloud,
      badge: analysisState?.isAnalyzing ? 'processing' : null,
    },
    {
      id: 'sermon_view',
      label: '설교 분석 결과',
      icon: BookOpen,
      badge: currentSermonTitle && !analysisState?.isAnalyzing ? 'done' : null,
    },
    {
      id: 'shorts',
      label: '숏폼 영상 생성',
      icon: Film,
      badge: null,
    },
    {
      id: 'shorts_list',
      label: '쇼츠 제작 목록',
      icon: ListVideo,
      badge: shortsNotice,
    },
  ];

  const subNavItems = [
    {
      id: 'cardnews',
      label: '설교카드 (5day 묵상)',
      icon: LayoutTemplate,
      badge: cardNotice === 'processing' ? 'processing' : null,
    },
    {
      id: 'card_list',
      label: '카드설교 보관함',
      icon: Layers,
      badge: cardNotice === 'done' ? 'done' : null,
    },
  ];

  if (isAdmin) {
    subNavItems.push({
      id: 'admin_dashboard',
      label: '관리자 대시보드',
      icon: ShieldCheck,
      isAdminOnly: true,
    });
  }

  return (
    <>
      {/* ── 배경 반투명 오버레이 ── */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 backdrop-blur-2xs z-50 transition-opacity animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* ── 네이션스 바이블 스타일 1:1 완벽 구현 사이드바 ── */}
      <aside
        onMouseLeave={onClose}
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-[#FBFBFA] border-r border-[#EFECE6] flex flex-col justify-between h-screen select-none transition-transform duration-300 ease-in-out z-50 overflow-hidden shadow-2xl text-[#2B2927] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* 1. 상단 네이션스 바이블 타이포 헤더 + 패널 토글 아이콘 */}
          <div className="px-5 pt-6 pb-4 flex items-start justify-between border-b border-[#EFECE6]/80">
            <div>
              <div className="font-serif tracking-tight font-black leading-none text-[#1C1A18] text-lg">
                NATIONS
              </div>
              <div className="font-serif tracking-tight font-black leading-none text-[#1C1A18] text-lg mt-1 flex items-center gap-1.5">
                <span>SERMON</span>
                <span className="text-[#DA7756] font-sans font-black text-base">AI</span>
              </div>
            </div>

            {/* 네이션스 바이블 우측 패널 닫기 아이콘 */}
            <button
              type="button"
              onClick={onClose}
              className="text-[#96938D] hover:text-[#282622] transition-colors p-1 cursor-pointer"
              title="사이드바 닫기"
            >
              <SidebarPanelIcon className="w-5 h-5 text-[#8A8781]" />
            </button>
          </div>

          {/* 2. 상단 기본 퀵 메뉴 */}
          <div className="px-3 pt-3 pb-2 space-y-0.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#EFECE6] text-[#1C1A18] font-bold'
                      : 'text-[#5E5B55] hover:text-[#1C1A18] hover:bg-[#F4F1EA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 stroke-[1.8] ${isActive ? 'text-[#1C1A18]' : 'text-[#8A8781]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge === 'processing' && (
                    <span className="w-2 h-2 rounded-full bg-[#DA7756] animate-pulse" />
                  )}
                  {item.badge === 'done' && (
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. 섹션 구분: 제작 및 보관 목록 */}
          <div className="px-3 pt-3 pb-2 border-t border-[#EFECE6]/80 space-y-1">
            <div className="px-3 pb-1 text-[11.5px] font-bold text-[#A3A099]">
              설교 콘텐츠 목록
            </div>
            {subNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all text-left cursor-pointer ${
                    item.isAdminOnly
                      ? isActive
                        ? 'bg-red-50 text-red-700 font-bold border border-red-200'
                        : 'text-red-700 hover:bg-red-50/70 font-semibold'
                      : isActive
                      ? 'bg-[#EFECE6] text-[#1C1A18] font-bold'
                      : 'text-[#5E5B55] hover:text-[#1C1A18] hover:bg-[#F4F1EA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 stroke-[1.8] ${item.isAdminOnly ? 'text-red-600' : isActive ? 'text-[#1C1A18]' : 'text-[#8A8781]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.isAdminOnly && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-mono">
                      ADMIN
                    </span>
                  )}
                  {item.badge === 'done' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#73706A] font-semibold">
                      완료
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 4. 네이션스 바이블 스타일 'AI 설교' 및 '충전 / 저장 크레딧' 위젯 */}
          <div className="px-3 pt-3 pb-2 border-t border-[#EFECE6]/80 space-y-2">
            {/* AI 설교 헤더 */}
            <div className="flex items-center gap-2 px-3 py-1 text-[13px] font-bold text-[#3B3835]">
              <NationsSparkleIcon className="w-3.5 h-3.5 text-[#5E5B55]" />
              <span>AI 설교 솔루션</span>
            </div>

            {/* 충전 카드 */}
            <div 
              onClick={() => {
                if (onOpenPricing) onOpenPricing();
                if (onClose) onClose();
              }}
              className="flex items-center justify-between px-3.5 py-2 text-[12.5px] text-[#5E5B55] hover:bg-[#F4F1EA] rounded-xl cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-[#8A8781]" />
                <span className="font-medium">충전</span>
              </div>
              <div className="text-right leading-tight">
                <div className="text-xs font-semibold text-[#1C1A18]">
                  보유 크레딧: <span className="font-bold text-[#1C1A18]">674</span>
                </div>
                <div className="text-[10.5px] text-[#8A8781]">
                  유효기간 <span className="text-[#DA7756] font-semibold">356일 남음</span>
                </div>
              </div>
            </div>

            {/* 저장 카드 */}
            <div className="flex items-center justify-between px-3.5 py-2 text-[12.5px] text-[#5E5B55] hover:bg-[#F4F1EA] rounded-xl transition-colors">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-[#8A8781]" />
                <span className="font-medium">저장</span>
              </div>
              <div className="text-right leading-tight flex items-center gap-1.5">
                <div className="text-xs font-medium text-[#1C1A18]">
                  설교 클라우드 <span className="font-bold">300</span>
                </div>
                <span className="text-[10.5px] px-1.5 py-0.2 rounded border border-[#D5D2CA] text-[#5E5B55] font-mono">
                  7
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. 사이드바 하단: 네이션스 바이블 100% 동일 프로필 & 푸터 */}
        <div className="p-3 border-t border-[#EFECE6]/80 bg-[#FBFBFA] space-y-2">
          {!userLoading && currentUser ? (
            /* 네이션스 바이블 스타일 프로필 박스 */
            <div className="p-2 px-3 rounded-2xl bg-[#F6F4EE] border border-[#E9E6DE] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#282622] text-white flex items-center justify-center shrink-0 ring-1 ring-black/10">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-amber-700 to-amber-900 text-white font-bold text-xs">
                      {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#1C1A18] truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] text-[#8A8781] font-mono font-medium">
                      admin
                    </span>
                  )}
                </div>
              </div>

              {/* 네이션스 바이블 둥근 테두리 로그아웃 버튼 */}
              <button
                type="button"
                onClick={onLogout}
                className="px-2 py-1 rounded-lg border border-[#E0DED7] bg-white text-[#DA7756] text-[11px] font-semibold hover:bg-[#FAF9F5] transition-colors cursor-pointer shrink-0"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onOpenLogin) onOpenLogin();
                if (onClose) onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>네이션스 바이블 로그인</span>
            </button>
          )}

          {/* 설정 버튼 */}
          <button
            type="button"
            onClick={() => {
              if (onOpenPricing) onOpenPricing();
              if (onClose) onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-[#5E5B55] hover:text-[#1C1A18] hover:bg-[#F4F1EA] rounded-xl transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[#8A8781]" />
            <span className="font-medium text-[12.5px]">설정</span>
          </button>

          {/* 네이션스 솔루션 & 1:1 문의 & 약관 푸터 */}
          <div className="pt-2 border-t border-[#EFECE6]/80 px-2 space-y-1 text-[#8A8781] text-[10.5px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#5E5B55]">네이션스 솔루션</span>
              <a
                href="https://pf.kakao.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFE812] text-[#3C1E1E] font-black text-[10px] hover:brightness-95 transition-all shadow-2xs"
              >
                <span>💬 1:1 문의</span>
              </a>
            </div>
            <div className="flex items-center gap-1 text-[9.5px] text-[#A3A099] pt-0.5">
              <span>이용약관</span>
              <span>&bull;</span>
              <span>개인정보처리방침</span>
              <span>&bull;</span>
              <span>사업자정보</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
