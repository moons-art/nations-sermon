import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function TitleEditModal({ shortItem, onClose, onSave }) {
  const [titleQuestion, setTitleQuestion] = useState(
    shortItem.title_question || shortItem.hook || shortItem.title || ''
  );
  const [titleAnswer, setTitleAnswer] = useState(
    shortItem.title_answer || shortItem.title || ''
  );

  const handleSave = () => {
    // sentences는 변경 없이 그대로 전달, 제목/소제목만 갱신
    onSave(shortItem.id, shortItem.sentences || [], titleQuestion.trim(), titleAnswer.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#FAF9F5] rounded-2xl shadow-2xl max-w-lg w-full border border-[#EAE8E1] overflow-hidden">
        
        {/* 헤더 */}
        <div className="p-4 border-b border-[#EAE8E1] flex items-center justify-between bg-white">
          <div>
            <div className="text-[11px] font-mono text-[#807D77]">
              #{shortItem.id} &bull; {shortItem.startTime} ~ {shortItem.endTime} ({shortItem.duration})
            </div>
            <h3 className="text-sm font-bold text-[#282622] mt-0.5">
              쇼츠 제목 & 소제목 수정
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#807D77] hover:text-[#282622] hover:bg-[#EFECE3] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 입력 폼 */}
        <div className="p-5 space-y-4 bg-white">
          <p className="text-xs text-[#66635E] leading-relaxed">
            영상 상단에 2줄로 꽉 차게 들어갈 제목과 소제목을 입력해주세요. (길이가 길어도 한 줄에 예쁘게 자동 축소됩니다.)
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#282622] block mb-1">
                상단 1줄 제목 (화이트 볼드)
              </label>
              <input
                type="text"
                value={titleQuestion}
                onChange={(e) => setTitleQuestion(e.target.value)}
                placeholder="예: 예수님을 따르는 진짜 힘"
                className="w-full text-xs font-bold text-[#282622] bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#DA7756]"
              />
              <span className="text-[10px] text-[#807D77] mt-1 block">추천: 8~14자 내외의 짧고 강렬한 화두</span>
            </div>

            <div>
              <label className="text-xs font-bold text-[#DA7756] block mb-1">
                상단 2줄 소제목 (선명한 옐로우 볼드)
              </label>
              <input
                type="text"
                value={titleAnswer}
                onChange={(e) => setTitleAnswer(e.target.value)}
                placeholder="예: 의무감이 아니라 이것"
                className="w-full text-xs font-bold text-[#C56545] bg-[#FAF9F5] border border-[#E0DED7] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#DA7756]"
              />
              <span className="text-[10px] text-[#807D77] mt-1 block">추천: 8~15자 내외의 대조/호기심 자극 문구</span>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-[#EAE8E1] bg-[#FAF9F5] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E0DED7] text-xs font-medium text-[#66635E] hover:bg-white transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#282622] hover:bg-[#1E1D1A] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>수정 완료</span>
          </button>
        </div>

      </div>
    </div>
  );
}
