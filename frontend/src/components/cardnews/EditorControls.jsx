import React from 'react';
import { Palette, Type, Maximize2, Building2, Image as ImageIcon } from 'lucide-react';

export const BG_PRESETS = [
  { id: 'navy', name: '미드나잇 네이비', style: 'bg-[#181D27] text-white' },
  { id: 'warm', name: '웜 크림 베이지', style: 'bg-[#F4EFE6] text-[#282622]' },
  { id: 'sunset', name: '선셋 딥 로즈', style: 'bg-[#3A1D28] text-white' },
  { id: 'forest', name: '딥 포레스트', style: 'bg-[#14281D] text-white' },
  { id: 'minimal', name: '클린 화이트', style: 'bg-white text-[#282622] border border-[#EAE8E1]' },
];

export default function EditorControls({
  bgTheme,
  setBgTheme,
  customBgUrl,
  setCustomBgUrl,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  aspectRatio,
  setAspectRatio,
  churchName,
  setChurchName,
}) {
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCustomBgUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* 1. 배경 */}
        <div>
          <label className="block text-[11px] font-medium text-[#66635E] mb-1.5 flex items-center gap-1">
            <Palette className="w-3 h-3 text-[#807D77]" />
            <span>배경 테마</span>
          </label>
          <div className="flex items-center gap-1.5">
            {BG_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setBgTheme(p.id);
                  setCustomBgUrl(null);
                }}
                className={`w-6 h-6 rounded-md border transition-all ${
                  bgTheme === p.id && !customBgUrl
                    ? 'border-[#DA7756] scale-110 shadow-xs'
                    : 'border-[#DCD9CF]'
                } ${p.style.split(' ')[0]}`}
                title={p.name}
              />
            ))}
            <label className="w-6 h-6 rounded-md border border-dashed border-[#DCD9CF] hover:border-[#DA7756] flex items-center justify-center cursor-pointer text-[#807D77]">
              <ImageIcon className="w-3 h-3" />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* 2. 글씨체 */}
        <div>
          <label className="block text-[11px] font-medium text-[#66635E] mb-1.5 flex items-center gap-1">
            <Type className="w-3 h-3 text-[#807D77]" />
            <span>폰트</span>
          </label>
          <div className="grid grid-cols-2 gap-1 bg-[#EFECE3] p-0.5 rounded-lg">
            <button
              onClick={() => setFontFamily('serif')}
              className={`py-1 text-[11px] font-serif-kr rounded-md transition-all ${
                fontFamily === 'serif' ? 'bg-white text-[#282622] font-bold shadow-xs' : 'text-[#66635E]'
              }`}
            >
              명조체
            </button>
            <button
              onClick={() => setFontFamily('sans')}
              className={`py-1 text-[11px] font-sans rounded-md transition-all ${
                fontFamily === 'sans' ? 'bg-white text-[#282622] font-bold shadow-xs' : 'text-[#66635E]'
              }`}
            >
              고딕체
            </button>
          </div>
        </div>

        {/* 3. 글자 크기 */}
        <div>
          <label className="block text-[11px] font-medium text-[#66635E] mb-1.5">
            <span>크기</span>
          </label>
          <div className="grid grid-cols-3 gap-1 bg-[#EFECE3] p-0.5 rounded-lg">
            {['sm', 'md', 'lg'].map((s) => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`py-1 text-[11px] font-medium rounded-md transition-all ${
                  fontSize === s ? 'bg-white text-[#282622] font-bold shadow-xs' : 'text-[#66635E]'
                }`}
              >
                {s === 'sm' ? '작게' : s === 'md' ? '보통' : '크게'}
              </button>
            ))}
          </div>
        </div>

        {/* 4. 비율 */}
        <div>
          <label className="block text-[11px] font-medium text-[#66635E] mb-1.5 flex items-center gap-1">
            <Maximize2 className="w-3 h-3 text-[#807D77]" />
            <span>비율</span>
          </label>
          <div className="grid grid-cols-2 gap-1 bg-[#EFECE3] p-0.5 rounded-lg">
            <button
              onClick={() => setAspectRatio('4:5')}
              className={`py-1 text-[11px] font-medium rounded-md transition-all ${
                aspectRatio === '4:5' ? 'bg-white text-[#282622] font-bold shadow-xs' : 'text-[#66635E]'
              }`}
            >
              4:5 피드
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`py-1 text-[11px] font-medium rounded-md transition-all ${
                aspectRatio === '9:16' ? 'bg-white text-[#282622] font-bold shadow-xs' : 'text-[#66635E]'
              }`}
            >
              9:16 세로
            </button>
          </div>
        </div>

        {/* 5. 교회명 */}
        <div>
          <label className="block text-[11px] font-medium text-[#66635E] mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-[#807D77]" />
            <span>교회명</span>
          </label>
          <input
            type="text"
            value={churchName.replace('\n', ' ')}
            onChange={(e) => setChurchName(e.target.value)}
            className="w-full px-2.5 py-1 bg-[#FAF9F5] border border-[#E0DED7] rounded-lg text-xs text-[#282622] focus:outline-none focus:border-[#DA7756]"
          />
        </div>

      </div>
    </div>
  );
}
