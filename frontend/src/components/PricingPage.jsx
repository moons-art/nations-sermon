import React, { useState } from 'react';
import { Check, Sparkles, Zap, Crown, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../api/AuthContext';

const plans = [
  {
    id: 'free',
    name: '무료',
    badge: 'FREE',
    price: '0',
    unit: '원 / 월',
    description: '설교 AI를 처음 경험해 보세요',
    color: 'from-slate-400 to-slate-500',
    badgeColor: 'bg-slate-100 text-slate-600',
    icon: Sparkles,
    features: [
      '유튜브 설교 분석 3회/월',
      '설교문 텍스트 추출',
      '하이라이트 1개 쇼츠',
      '설교카드 3장/월',
      '워터마크 포함',
    ],
    notIncluded: [
      'HD 영상 내보내기',
      '5일 묵상카드',
      '배경음악 선택',
      '우선 지원',
    ],
    cta: '무료로 시작하기',
    popular: false,
  },
  {
    id: 'starter',
    name: '스타터',
    badge: 'STARTER',
    price: '19,900',
    unit: '원 / 월',
    description: '한 교회의 미디어 사역을 위한 플랜',
    color: 'from-[#DA7756] to-[#C46A40]',
    badgeColor: 'bg-[#DA7756]/10 text-[#DA7756]',
    icon: Zap,
    features: [
      '유튜브 설교 분석 20회/월',
      '설교문 텍스트 추출',
      '하이라이트 쇼츠 5개/설교',
      '설교카드 무제한',
      '5일 묵상카드 생성',
      'HD 영상 내보내기',
      '배경음악 10종 선택',
      '워터마크 없음',
    ],
    notIncluded: [
      '다중 채널 동시 관리',
      '전담 매니저 지원',
    ],
    cta: '스타터 시작하기',
    popular: true,
  },
  {
    id: 'pro',
    name: '프로',
    badge: 'PRO',
    price: '49,900',
    unit: '원 / 월',
    description: '다채널 미디어 사역팀을 위한 플랜',
    color: 'from-indigo-500 to-indigo-700',
    badgeColor: 'bg-indigo-50 text-indigo-700',
    icon: Crown,
    features: [
      '유튜브 설교 분석 무제한',
      '설교문 텍스트 추출',
      '하이라이트 쇼츠 무제한',
      '설교카드 무제한',
      '5일 묵상카드 생성',
      'HD 영상 내보내기',
      '배경음악 50종 선택',
      '워터마크 없음',
      '다중 채널 동시 관리',
      '카카오톡 전담 매니저',
    ],
    notIncluded: [],
    cta: '프로 시작하기',
    popular: false,
  },
];

export default function PricingPage({ isModal = false, onClose }) {
  const { currentUser } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  const handlePlanSelect = (plan) => {
    if (!currentUser) {
      alert(`${plan.name} 플랜 이용을 위해 먼저 로그인이 필요합니다.`);
      return;
    }
    if (plan.id === 'free') {
      onClose?.();
      return;
    }
    alert(`[${plan.name} 플랜] 결제 모듈 연동 준비 중입니다.\n카카오톡 1:1 문의를 통해 이용권을 구매하실 수 있습니다.`);
  };

  const content = (
    <div className="bg-[#FAFAF8] min-h-screen">
      {/* 헤더 */}
      <div className="relative bg-gradient-to-b from-[#1A1918] to-[#2C2B29] px-6 py-16 text-center">
        {isModal && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#DA7756]/20 border border-[#DA7756]/30 rounded-full mb-6">
          <Crown className="w-3.5 h-3.5 text-[#DA7756]" />
          <span className="text-[#DA7756] text-xs font-semibold">이용권 & 요금제</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          설교 AI로 미디어 사역을<br />
          <span className="bg-gradient-to-r from-[#DA7756] to-[#F0956B] bg-clip-text text-transparent">더 쉽고 강력하게</span>
        </h1>
        <p className="text-sm text-white/60 max-w-md mx-auto">
          유튜브 링크 하나로 설교 쇼츠, 묵상카드, 설교카드를 자동 생성하세요
        </p>

        {/* 월별 / 연별 토글 */}
        <div className="mt-8 inline-flex bg-white/10 rounded-xl p-1 gap-1">
          {[['monthly', '월간 결제'], ['yearly', '연간 결제 (2개월 무료)']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setBillingCycle(val)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                billingCycle === val ? 'bg-white text-[#2C2B29] shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 요금제 카드 */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const yearlyPrice = plan.price === '0' ? '0' : String(Math.round(parseInt(plan.price.replace(',', '')) * 10 / 12)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            const displayPrice = billingCycle === 'yearly' && plan.price !== '0' ? yearlyPrice : plan.price;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  plan.popular ? 'border-[#DA7756] shadow-lg shadow-[#DA7756]/10' : 'border-[#E7E2D8] shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-[#DA7756] to-[#C46A40] text-white text-[11px] font-bold text-center py-1.5 tracking-wider">
                    🔥 가장 인기있는 플랜
                  </div>
                )}

                <div className="p-6">
                  {/* 플랜 아이콘 & 이름 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-sm`}>
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1918] text-sm">{plan.name}</div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${plan.badgeColor}`}>{plan.badge}</span>
                      </div>
                    </div>
                  </div>

                  {/* 가격 */}
                  <div className="mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-[#1A1918]">{displayPrice === '0' ? '무료' : `₩${displayPrice}`}</span>
                      {displayPrice !== '0' && <span className="text-[11px] text-[#8C877D]">{billingCycle === 'yearly' ? '/월 (연간)' : '/월'}</span>}
                    </div>
                    {billingCycle === 'yearly' && plan.price !== '0' && (
                      <p className="text-[10px] text-[#DA7756] font-semibold mt-0.5">연간 결제 시 2개월 무료 혜택</p>
                    )}
                  </div>

                  <p className="text-[11px] text-[#8C877D] mb-5">{plan.description}</p>

                  {/* CTA 버튼 */}
                  <button
                    onClick={() => handlePlanSelect(plan)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer mb-5 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-[#DA7756] to-[#C46A40] text-white hover:from-[#C46A40] hover:to-[#B55434] shadow-sm hover:shadow'
                        : 'bg-[#F0ECE4] text-[#2C2B29] hover:bg-[#E7E2D8]'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  {/* 기능 목록 */}
                  <div className="space-y-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.popular ? 'bg-[#DA7756]/10' : 'bg-emerald-50'}`}>
                          <Check className={`w-2.5 h-2.5 ${plan.popular ? 'text-[#DA7756]' : 'text-emerald-600'}`} />
                        </div>
                        <span className="text-[11px] text-[#4A4743]">{f}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 opacity-40">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-slate-100">
                          <X className="w-2.5 h-2.5 text-slate-400" />
                        </div>
                        <span className="text-[11px] text-[#8C877D] line-through">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 카카오톡 문의 */}
        <div className="mt-10 bg-white border border-[#E7E2D8] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEE500] flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-[#3C1E1E]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1918] text-sm">Nations Sermon 1:1 문의</h3>
              <p className="text-[11px] text-[#8C877D]">플랜 선택이 어려우신가요? 카카오톡으로 실시간 상담하세요.</p>
            </div>
          </div>
          <a
            href="http://pf.kakao.com/_cxjBxaX/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#FEE500] hover:bg-[#FDD800] text-[#3C1E1E] rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            카카오톡 문의하기
          </a>
        </div>

        {/* 하단 법적 고지 */}
        <div className="mt-8 text-center text-[11px] text-[#A39E94] space-y-1">
          <p>모든 요금은 부가세(VAT) 포함 금액입니다. 언제든지 해지하실 수 있습니다.</p>
          <p>© {new Date().getFullYear()} Nations Sermon Studio. All rights reserved.</p>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
        <div className="min-h-screen flex items-start justify-center p-4 py-8">
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}
