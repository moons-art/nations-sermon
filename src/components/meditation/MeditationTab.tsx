import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import KakaoCopyButton from './KakaoCopyButton';
import { SermonAnalysisData } from '../../utils/mockData';

interface MeditationTabProps {
  sermonData: SermonAnalysisData;
}

export default function MeditationTab({ sermonData }: MeditationTabProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const meditations = sermonData.meditations || [];
  const currentMeditation = meditations.find((m) => m.day === selectedDay) || meditations[0];

  if (!currentMeditation) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#EAE8E1]">
        <p className="text-xs text-[#807D77]">생성된 설교 묵상 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* 요일 선택 바 & 카톡 복사 버튼 */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#EFECE3] rounded-xl overflow-x-auto">
          {meditations.map((item) => {
            const isActive = item.day === selectedDay;
            return (
              <button
                key={item.day}
                onClick={() => setSelectedDay(item.day)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-[#282622] shadow-xs'
                    : 'text-[#66635E] hover:text-[#282622]'
                }`}
              >
                Day {item.day} ({item.dayName})
              </button>
            );
          })}
        </div>

        <KakaoCopyButton
          meditation={currentMeditation}
          sermonMeta={sermonData.metadata}
        />
      </div>

      {/* 묵상 본문 상세 */}
      <div className="bg-white rounded-2xl p-8 border border-[#EAE8E1] space-y-7">
        
        {/* 헤더 */}
        <div className="border-b border-[#F2EFE8] pb-5">
          <div className="text-xs font-mono text-[#DA7756] mb-1">
            DAY {currentMeditation.day} • {currentMeditation.dayName}
          </div>
          <h1 className="text-2xl font-bold text-[#282622] tracking-tight">
            {currentMeditation.theme}
          </h1>
        </div>

        {/* 1. 성경 말씀 */}
        <div className="p-4 bg-[#FAF9F5] border border-[#EAE8E1] rounded-xl">
          <div className="text-[11px] font-semibold text-[#807D77] uppercase mb-1.5 flex items-center gap-1 font-mono">
            <BookOpen className="w-3.5 h-3.5" />
            <span>오늘의 말씀</span>
          </div>
          <p className="text-sm font-serif-kr text-[#282622] leading-relaxed whitespace-pre-line font-medium">
            {currentMeditation.bibleVerse}
          </p>
        </div>

        {/* 2. 본문 묵상 */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#282622] uppercase tracking-wider font-mono">
            말씀 묵상
          </div>
          <div className="text-sm text-[#3E3C38] leading-relaxed whitespace-pre-line font-sans space-y-4">
            {currentMeditation.content}
          </div>
        </div>

        {/* 3. 질문 & 적용 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
            <div className="text-xs font-bold text-[#282622] mb-1 font-mono">
              Q. 묵상 질문
            </div>
            <p className="text-xs text-[#66635E] leading-relaxed font-medium">
              {currentMeditation.question}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
            <div className="text-xs font-bold text-[#282622] mb-1 font-mono">
              A. 삶의 적용
            </div>
            <p className="text-xs text-[#66635E] leading-relaxed font-medium">
              {currentMeditation.application}
            </p>
          </div>
        </div>

        {/* 4. 닫는 기도 */}
        <div className="p-5 rounded-xl bg-[#FAF9F5] border border-[#EAE8E1]">
          <div className="text-xs font-bold text-[#282622] mb-2 font-mono">
            오늘의 닫는 기도
          </div>
          <p className="text-xs text-[#52504B] font-serif-kr italic leading-relaxed whitespace-pre-line">
            "{currentMeditation.closingPrayer}"
          </p>
        </div>

      </div>
    </div>
  );
}
