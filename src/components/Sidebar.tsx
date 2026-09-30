import { useState } from 'react';
import {
  UploadCloud,
  Film,
  ListVideo,
  LayoutTemplate,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentSermonTitle?: string;
  shortsNotice: 'processing' | 'done' | null;
  cardNotice: 'processing' | 'done' | null;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentSermonTitle,
  shortsNotice,
  cardNotice,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    {
      id: 'upload',
      label: '나의 설교 업로드',
      icon: UploadCloud,
      subText: currentSermonTitle || '업로드된 설교 없음',
      badge: null,
    },
    {
      id: 'shorts',
      label: '쇼츠 생성',
      icon: Film,
      badge: null,
    },
    {
      id: 'shorts_list',
      label: '쇼츠 목록',
      icon: ListVideo,
      badge: shortsNotice, // 'processing' (주황점) or 'done' (파란점)
    },
    {
      id: 'cardnews',
      label: '설교카드',
      icon: LayoutTemplate,
      badge: cardNotice === 'processing' ? 'processing' : null,
    },
    {
      id: 'card_list',
      label: '카드설교 목록',
      icon: Layers,
      badge: cardNotice === 'done' ? 'done' : null,
    },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${
        isHovered ? 'w-64' : 'w-18'
      } flex-shrink-0 bg-[#FAF9F5] border-r border-[#EAE8E1] flex flex-col justify-between h-screen sticky top-0 select-none transition-all duration-300 ease-in-out z-40 overflow-hidden shadow-xs`}
    >
      <div>
        {/* 상단 앱 로고 헤더 */}
        <div className="p-4 border-b border-[#EAE8E1] h-18 flex flex-col justify-center">
          {isHovered ? (
            <div className="animate-fadeIn whitespace-nowrap overflow-hidden">
              <div className="text-[11px] font-bold tracking-[0.25em] text-[#807D77] uppercase leading-tight font-mono">
                NATIONS
              </div>
              <div className="text-lg font-bold tracking-tight text-[#282622] flex items-center gap-1.5 mt-0.5">
                <span>SERMON</span>
                <span className="text-[#DA7756] font-extrabold">AI</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <span className="text-[10px] font-mono text-[#807D77] font-bold leading-none">N</span>
              <span className="text-xs font-extrabold text-[#DA7756] leading-tight">AI</span>
            </div>
          )}
        </div>

        {/* 메인 메뉴 목록 */}
        <nav className="p-2 space-y-1.5 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all text-left relative ${
                    isActive
                      ? 'bg-[#EFECE3] text-[#282622] font-semibold shadow-xs'
                      : 'text-[#66635E] hover:text-[#282622] hover:bg-[#F2EFE8]'
                  }`}
                  title={!isHovered ? item.label : undefined}
                >
                  {/* 메뉴 아이콘 */}
                  <div className="relative flex-shrink-0">
                    <Icon
                      className={`w-4 h-4 stroke-[1.8] ${
                        isActive ? 'text-[#DA7756]' : 'text-[#807D77]'
                      }`}
                    />
                    {/* 축소 모드일 때 알림 점 */}
                    {!isHovered && item.badge === 'processing' && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#DA7756] animate-pulse"></span>
                    )}
                    {!isHovered && item.badge === 'done' && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#2563EB]"></span>
                    )}
                  </div>

                  {/* 확장 모드일 때 라벨 & 알림 점 */}
                  {isHovered && (
                    <div className="flex-1 flex items-center justify-between min-w-0 animate-fadeIn whitespace-nowrap">
                      <span className="truncate">{item.label}</span>

                      {/* 메뉴 끝 상태 점 */}
                      {item.badge === 'processing' && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#DA7756] animate-pulse ml-2 flex-shrink-0"
                          title="생성 중"
                        ></span>
                      )}
                      {item.badge === 'done' && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#2563EB] ml-2 flex-shrink-0"
                          title="새로운 생성 완료"
                        ></span>
                      )}
                    </div>
                  )}
                </button>

                {/* [나의 설교 업로드] 아래에 업로드된 설교 이름 표시 */}
                {item.id === 'upload' && isHovered && (
                  <div className="pl-9 pr-3 pt-0.5 pb-1 animate-fadeIn">
                    <p className="text-[10px] text-[#A5A29B] font-serif-kr truncate leading-tight">
                      &bull; {item.subText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* 하단 AI 엔진 배지 */}
      <div className="p-3 border-t border-[#EAE8E1]">
        <div
          className="w-full flex items-center justify-center sm:justify-between px-2.5 py-2 rounded-xl text-xs text-[#66635E] bg-[#F2EFE8]/60 border border-[#E5E3DB]"
          title="Gemini 3.8 Flash AI Engine"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#DA7756] flex-shrink-0" />
          {isHovered && (
            <span className="font-medium text-[11px] truncate ml-2 text-[#807D77]">
              Gemini 3.8 Flash
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
