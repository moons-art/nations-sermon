import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Layers, Loader2, Check } from 'lucide-react';
import { downloadElementAsImage } from '../../utils/exportImage';
import { CardNewsSlide } from '../../utils/mockData';

interface SlideNavigatorProps {
  slides: CardNewsSlide[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  title?: string;
}

export default function SlideNavigator({
  slides,
  currentIndex,
  setCurrentIndex,
  canvasRef,
  title = 'sermon-card',
}: SlideNavigatorProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  const handleDownloadCurrent = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      await downloadElementAsImage(canvasRef.current, `${title}-slide-${currentIndex + 1}.png`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    const orig = currentIndex;

    try {
      for (let i = 0; i < slides.length; i++) {
        setCurrentIndex(i);
        await new Promise((r) => setTimeout(r, 250));
        if (canvasRef.current) {
          await downloadElementAsImage(canvasRef.current, `${title}-slide-${i + 1}.png`);
        }
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setCurrentIndex(orig);
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#EAE8E1]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* 이전 / 다음 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#EAE8E1] hover:bg-[#EFECE3] text-[#282622] flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-semibold text-[#282622] px-2">
            {currentIndex + 1} / {slides.length}
          </span>

          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#EAE8E1] hover:bg-[#EFECE3] text-[#282622] flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 썸네일 번호 */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full">
          {slides.map((s, idx) => (
            <button
              key={s.id || idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-6 h-7 rounded text-[11px] font-mono font-semibold border ${
                currentIndex === idx
                  ? 'border-[#DA7756] bg-[#FAF9F5] text-[#DA7756]'
                  : 'border-[#EAE8E1] bg-white text-[#807D77]'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* 다운로드 버튼 */}
        <div className="flex items-center gap-2">
          <button
            disabled={isExporting}
            onClick={handleDownloadCurrent}
            className="px-3 py-1.5 rounded-xl border border-[#E0DED7] text-xs font-medium text-[#66635E] hover:bg-[#FAF9F5]"
          >
            {downloadSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
            ) : (
              <Download className="w-3.5 h-3.5 inline mr-1 text-[#807D77]" />
            )}
            <span>현재 슬라이드 저장</span>
          </button>

          <button
            disabled={isExporting}
            onClick={handleDownloadAll}
            className="px-3.5 py-1.5 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
            ) : (
              <Layers className="w-3.5 h-3.5 inline mr-1" />
            )}
            <span>전체 {slides.length}장 일괄 저장</span>
          </button>
        </div>

      </div>
    </div>
  );
}
