import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Plus, Trash2, Check, Music, Play, Pause } from 'lucide-react';
import { fetchBgmList } from '../../api/client';

export default function SubtitleModal({ shortItem, onClose, onSave, saveLabel = "수정 저장" }) {
  const [sentences, setSentences] = useState(
    JSON.parse(JSON.stringify(shortItem.sentences || []))
  );
  const [titleQuestion, setTitleQuestion] = useState(
    shortItem.title_question || shortItem.hook || ''
  );
  const [titleAnswer, setTitleAnswer] = useState(
    shortItem.title_answer || shortItem.title || ''
  );
  const [bgm, setBgm] = useState(shortItem.bgm || 'calm_piano.mp3');
  const [bgmList, setBgmList] = useState([]);
  const [previewingBgm, setPreviewingBgm] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchBgmList().then(setBgmList).catch(console.error);
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const togglePreview = (targetBgm) => {
    if (!targetBgm || targetBgm === 'none') {
      if (audioRef.current) audioRef.current.pause();
      setPreviewingBgm(null);
      return;
    }
    if (previewingBgm === targetBgm) {
      if (audioRef.current) audioRef.current.pause();
      setPreviewingBgm(null);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setPreviewingBgm(null);
      }
      audioRef.current.src = `http://127.0.0.1:8000/api/assets/bgm-audio/${targetBgm}`;
      audioRef.current.volume = 0.8;
      audioRef.current.play().catch(e => console.warn(e));
      setPreviewingBgm(targetBgm);
    }
  };

  const handleTextChange = (index, value) => {
    const updated = [...sentences];
    updated[index].text = value;
    setSentences(updated);
  };

  const handleTimeChange = (index, field, value) => {
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

  const handleDeleteSentence = (index) => {
    setSentences(sentences.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const itemId = shortItem.id || shortItem.short_id || shortItem.job_id;
    onSave(itemId, sentences, titleQuestion, titleAnswer, bgm);
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
              쇼츠 자막 수정
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#807D77] hover:text-[#282622] hover:bg-[#EFECE3]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 제목 & 소제목 편집 */}
        <div className="p-4 bg-white border-b border-[#EAE8E1] space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#66635E] block mb-1">
                제목
              </label>
              <input
                type="text"
                value={titleQuestion}
                onChange={(e) => setTitleQuestion(e.target.value)}
                placeholder="제목"
                className="w-full text-xs font-bold text-[#282622] bg-[#FAF9F5] border border-[#E0DED7] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#DA7756]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#DA7756] block mb-1">
                소제목
              </label>
              <input
                type="text"
                value={titleAnswer}
                onChange={(e) => setTitleAnswer(e.target.value)}
                placeholder="소제목"
                className="w-full text-xs font-bold text-[#DA7756] bg-[#FAF9F5] border border-[#E0DED7] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#DA7756]"
              />
            </div>
          </div>

            {/* BGM 변경 및 미리듣기 */}
            <div className="pt-1 border-t border-[#F2EFE8]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold text-[#66635E] flex items-center gap-1">
                  <Music className="w-3 h-3 text-[#807D77]" />
                  <span>배경음악 (BGM) 선택</span>
                </label>
                {bgm && bgm !== 'none' && (
                  <button
                    type="button"
                    onClick={() => togglePreview(bgm)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      previewingBgm === bgm
                        ? 'bg-[#DA7756] text-white animate-pulse'
                        : 'bg-[#EFECE3] text-[#66635E] hover:text-[#282622]'
                    }`}
                  >
                    {previewingBgm === bgm ? (
                      <>
                        <Pause className="w-2.5 h-2.5" />
                        <span>정지</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>음악 미리듣기</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <select
                value={bgm}
                onChange={(e) => {
                  const val = e.target.value;
                  setBgm(val);
                  if (previewingBgm) togglePreview(val);
                }}
                className="w-full text-xs bg-[#FAF9F5] border border-[#E0DED7] rounded-lg px-2 py-1.5 text-[#282622] font-medium focus:outline-none focus:border-[#DA7756]"
              >
                {bgmList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.desc}
                  </option>
                ))}
              </select>
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#282622] hover:bg-[#1E1D1A] text-white shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saveLabel}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
