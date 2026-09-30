import { useState } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { ShortItem, SentenceItem } from '../../utils/mockData';

interface SubtitleModalProps {
  shortItem: ShortItem;
  onClose: () => void;
  onSave: (
    shortId: string,
    newSentences: SentenceItem[],
    newQuestion?: string,
    newAnswer?: string
  ) => void;
}

export default function SubtitleModal({ shortItem, onClose, onSave }: SubtitleModalProps) {
  const [sentences, setSentences] = useState<SentenceItem[]>(
    JSON.parse(JSON.stringify(shortItem.sentences || []))
  );
  const [titleQuestion, setTitleQuestion] = useState(
    shortItem.title_question || shortItem.hook || ''
  );
  const [titleAnswer, setTitleAnswer] = useState(
    shortItem.title_answer || shortItem.title || ''
  );

  const handleTextChange = (index: number, value: string) => {
    const updated = [...sentences];
    updated[index].text = value;
    setSentences(updated);
  };

  const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...sentences];
    updated[index][field] = value;
    setSentences(updated);
  };

  const handleAddSentence = () => {
    const lastItem = sentences[sentences.length - 1];
    const newStart = lastItem ? lastItem.end : '00:00';
    setSentences([
      ...sentences,
      { id: Date.now(), start: newStart, end: newStart, text: '새로운 자막을 입력하세요.' },
    ]);
  };

  const handleDeleteSentence = (index: number) => {
    setSentences(sentences.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    onSave(shortItem.id, sentences, titleQuestion, titleAnswer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#FAF9F5] rounded-2xl shadow-xl max-w-xl w-full flex flex-col max-h-[85vh] border border-[#EAE8E1]">
        
        {/* 헤더 */}
        <div className="p-4 border-b border-[#EAE8E1] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-[#807D77]">
              {shortItem.startTime} ~ {shortItem.endTime} ({shortItem.duration})
            </div>
            <h3 className="text-sm font-bold text-[#282622] mt-0.5 truncate max-w-md">
              쇼츠 텍스트 & 자막 편집
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#807D77] hover:text-[#282622] hover:bg-[#EFECE3]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 상단 2줄 헤더 텍스트 편집 영역 */}
        <div className="p-4 bg-white border-b border-[#EAE8E1] space-y-2.5">
          <div className="text-[11px] font-bold text-[#807D77] uppercase tracking-wider">
            유튜브 쇼츠 상단 글자 배치
          </div>
          <div className="space-y-1.5">
            <div>
              <label className="text-[10px] font-semibold text-[#66635E] block mb-0.5">
                상단 1줄: 궁금증 유발 제목 (화이트 볼드)
              </label>
              <input
                type="text"
                value={titleQuestion}
                onChange={(e) => setTitleQuestion(e.target.value)}
                placeholder="예: 인생의 쓴맛 앞에서"
                className="w-full text-xs font-bold text-[#282622] bg-[#FAF9F5] border border-[#E0DED7] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#DA7756]"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#DA7756] block mb-0.5">
                상단 2줄: 기대 유발 대답/내용 (골드 옐로우 볼드)
              </label>
              <input
                type="text"
                value={titleAnswer}
                onChange={(e) => setTitleAnswer(e.target.value)}
                placeholder="예: 마라의 쓴물이 단물로 변하는 순간"
                className="w-full text-xs font-bold text-[#C56545] bg-[#FAF9F5] border border-[#E0DED7] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#DA7756]"
              />
            </div>
          </div>
        </div>

        {/* 문장 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {sentences.map((sentence, idx) => (
            <div
              key={sentence.id || idx}
              className="p-3 bg-white rounded-xl border border-[#EAE8E1] space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-[#66635E]">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-[#807D77]">{idx + 1}.</span>
                  <input
                    type="text"
                    value={sentence.start}
                    onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                    className="w-14 px-1 py-0.5 text-center bg-[#FAF9F5] border border-[#E0DED7] rounded text-[11px] focus:outline-none focus:border-[#DA7756]"
                  />
                  <span>~</span>
                  <input
                    type="text"
                    value={sentence.end}
                    onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                    className="w-14 px-1 py-0.5 text-center bg-[#FAF9F5] border border-[#E0DED7] rounded text-[11px] focus:outline-none focus:border-[#DA7756]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSentence(idx)}
                  className="text-[#A5A29B] hover:text-red-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <textarea
                rows={2}
                value={sentence.text}
                onChange={(e) => handleTextChange(idx, e.target.value)}
                className="w-full text-xs text-[#282622] bg-[#FAF9F5] border border-[#E0DED7] rounded-lg p-2 focus:outline-none focus:border-[#DA7756] resize-none"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddSentence}
            className="w-full py-2 border border-dashed border-[#DCD9CF] hover:border-[#DA7756] text-[#66635E] hover:text-[#DA7756] rounded-xl text-xs font-medium flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>자막 문장 추가</span>
          </button>
        </div>

        {/* 푸터 */}
        <div className="p-3 border-t border-[#EAE8E1] flex items-center justify-end gap-2 bg-[#FAF9F5]">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs text-[#66635E] hover:bg-[#EFECE3]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#282622] hover:bg-[#1E1D1A] text-white shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>수정 저장</span>
          </button>
        </div>

      </div>
    </div>
  );
}
