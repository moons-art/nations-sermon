import React, { useState } from 'react';
import { Check, MessageCircle, Copy } from 'lucide-react';

export default function KakaoCopyButton({ meditation, sermonMeta }) {
  const [copied, setCopied] = useState(false);

  const formatKakaoText = () => {
    const divider = '─'.repeat(20);
    return `[${sermonMeta?.churchName?.replace('\n', ' ') || '말씀 묵상'}]
✨ ${meditation.dayName}의 말씀 묵상

📖 본문: ${meditation.theme}
${meditation.bibleVerse}

${divider}
🌱 [오늘의 묵상]
${meditation.content}

${divider}
❓ [묵상 질문]
${meditation.question}

💡 [삶의 적용]
${meditation.application}

${divider}
🙏 [마치는 기도]
${meditation.closingPrayer}`;
  };

  const handleCopy = async () => {
    try {
      const text = formatKakaoText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
        copied
          ? 'bg-emerald-600 text-white'
          : 'bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919]'
      }`}
      title="카카오톡 공유 텍스트 복사"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>복사 완료</span>
        </>
      ) : (
        <>
          <MessageCircle className="w-3.5 h-3.5 fill-[#191919]" />
          <span>카카오톡 공유용 복사</span>
        </>
      )}
    </button>
  );
}
