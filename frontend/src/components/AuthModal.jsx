import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../api/firebaseConfig';
import { X, Mail, Lock, Eye, EyeOff, ArrowRight, User, Sparkles } from 'lucide-react';

// Google SVG 아이콘
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTab('login');
      setIsResetMode(false);
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      setDisplayName('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 구글 로그인
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onSuccess?.();
        onClose?.();
      }
    } catch (err) {
      console.error('[AuthModal] Google login error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setErrorMsg('로그인 창이 닫혔습니다.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('팝업이 차단되었습니다. 브라우저 팝업 허용 설정을 확인해주세요.');
      } else {
        setErrorMsg('구글 로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 재설정
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('이메일 주소를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg('비밀번호 재설정 이메일이 발송되었습니다! 메일함을 확인해주세요.');
    } catch (err) {
      if (err.code === 'auth/user-not-found') setErrorMsg('등록되지 않은 이메일 주소입니다.');
      else if (err.code === 'auth/invalid-email') setErrorMsg('올바른 이메일 형식이 아닙니다.');
      else setErrorMsg('이메일 발송 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 이메일 로그인 / 회원가입
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (tab === 'signup' && password !== passwordConfirm) {
      setErrorMsg('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (tab === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        onSuccess?.();
        onClose?.();
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onSuccess?.();
        onClose?.();
      }
    } catch (err) {
      console.error('[AuthModal] Email auth error:', err);
      if (err.code === 'auth/email-already-in-use') setErrorMsg('이미 등록된 이메일입니다. 로그인을 진행해주세요.');
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') setErrorMsg('이메일 또는 비밀번호가 일치하지 않습니다.');
      else if (err.code === 'auth/user-not-found') setErrorMsg('등록되지 않은 이메일입니다.');
      else if (err.code === 'auth/invalid-email') setErrorMsg('올바른 이메일 형식이 아닙니다.');
      else setErrorMsg('인증 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="bg-[#FAFAF8] rounded-2xl shadow-2xl w-full max-w-md border border-[#E7E2D8] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E7E2D8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#DA7756] to-[#C46A40] flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#1A1918] text-sm">Nations Sermon Studio</h2>
              <p className="text-[11px] text-[#8C877D]">AI 설교 미디어 제작 플랫폼</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8C877D] hover:text-[#2C2B29] hover:bg-[#F0ECE4] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 탭 전환 */}
          {!isResetMode && (
            <div className="flex bg-[#F0ECE4] rounded-xl p-1">
              {['login', 'signup'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setErrorMsg(null); setSuccessMsg(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    tab === t ? 'bg-white text-[#2C2B29] shadow-sm' : 'text-[#6E6A63] hover:text-[#2C2B29]'
                  }`}
                >
                  {t === 'login' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>
          )}

          {/* 구글 로그인 버튼 */}
          {!isResetMode && (
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 bg-white border border-[#DDD8CE] hover:border-[#C46A40] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#2C2B29] transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Google 계정으로 {tab === 'login' ? '로그인' : '가입'}하기</span>
            </button>
          )}

          {/* 구분선 */}
          {!isResetMode && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E7E2D8]" />
              <span className="text-[11px] text-[#A39E94] font-medium">또는 이메일로</span>
              <div className="flex-1 h-px bg-[#E7E2D8]" />
            </div>
          )}

          {/* 비밀번호 재설정 모드 */}
          {isResetMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[#1A1918] mb-1">비밀번호 재설정</h3>
                <p className="text-[11px] text-[#8C877D]">가입하신 이메일 주소를 입력하시면 재설정 링크를 보내드립니다.</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6E6A63] mb-1">이메일 주소</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-[#DDD8CE] focus:border-[#C46A40] focus:ring-2 focus:ring-[#C46A40]/10 rounded-xl px-3.5 py-2 pl-9 text-xs text-[#2C2B29] outline-none transition-all placeholder:text-[#A39E94]"
                    required
                  />
                  <Mail className="w-4 h-4 text-[#A39E94] absolute left-3 top-2.5" />
                </div>
              </div>
              {successMsg && <p className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{successMsg}</p>}
              {errorMsg && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#C46A40] hover:bg-[#B55434] text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                재설정 이메일 보내기
              </button>
              <button type="button" onClick={() => { setIsResetMode(false); setErrorMsg(null); setSuccessMsg(null); }} className="w-full text-[11px] text-[#8C877D] hover:text-[#2C2B29] transition-colors cursor-pointer">
                ← 로그인으로 돌아가기
              </button>
            </form>
          ) : (
            /* 이메일 로그인/회원가입 폼 */
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {tab === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E6A63] mb-1">이름 (선택)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="홍길동 목사"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-white border border-[#DDD8CE] focus:border-[#C46A40] focus:ring-2 focus:ring-[#C46A40]/10 rounded-xl px-3.5 py-2 pl-9 text-xs text-[#2C2B29] outline-none transition-all placeholder:text-[#A39E94]"
                    />
                    <User className="w-4 h-4 text-[#A39E94] absolute left-3 top-2.5" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#6E6A63] mb-1">이메일 주소</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-[#DDD8CE] focus:border-[#C46A40] focus:ring-2 focus:ring-[#C46A40]/10 rounded-xl px-3.5 py-2 pl-9 text-xs text-[#2C2B29] outline-none transition-all placeholder:text-[#A39E94]"
                    required
                  />
                  <Mail className="w-4 h-4 text-[#A39E94] absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-[#6E6A63]">
                    비밀번호 {tab === 'signup' ? '(6자 이상)' : ''}
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(true); setErrorMsg(null); setSuccessMsg(null); }}
                      className="text-[10px] text-[#C46A40] hover:underline cursor-pointer"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-[#DDD8CE] focus:border-[#C46A40] focus:ring-2 focus:ring-[#C46A40]/10 rounded-xl px-3.5 py-2 pl-9 pr-10 text-xs text-[#2C2B29] outline-none transition-all placeholder:text-[#A39E94]"
                    required
                  />
                  <Lock className="w-4 h-4 text-[#A39E94] absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#A39E94] hover:text-[#2C2B29] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {tab === 'signup' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#6E6A63]">비밀번호 확인</label>
                    {password && passwordConfirm && (
                      <span className={`text-[10px] font-medium ${password === passwordConfirm ? 'text-emerald-600' : 'text-red-500'}`}>
                        {password === passwordConfirm ? '✓ 일치합니다' : '✕ 일치하지 않습니다'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className={`w-full bg-white border rounded-xl px-3.5 py-2 pl-9 pr-10 text-xs text-[#2C2B29] outline-none transition-all placeholder:text-[#A39E94] ${
                        passwordConfirm && password !== passwordConfirm
                          ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/10'
                          : 'border-[#DDD8CE] focus:border-[#C46A40] focus:ring-2 focus:ring-[#C46A40]/10'
                      }`}
                      required
                    />
                    <Lock className="w-4 h-4 text-[#A39E94] absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-3 top-2.5 text-[#A39E94] hover:text-[#2C2B29] transition-colors cursor-pointer"
                    >
                      {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>}
              {successMsg && <p className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{successMsg}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 w-full py-2.5 bg-[#C46A40] hover:bg-[#B55434] active:bg-[#9B4527] text-white rounded-xl text-xs font-semibold transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? '처리 중...' : tab === 'login' ? '이메일로 로그인' : '가입 완료하기'}</span>
                {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}

          {/* 약관 동의 안내 */}
          <p className="text-[10px] text-[#A39E94] text-center leading-relaxed pt-1 border-t border-[#E7E2D8]">
            가입 또는 로그인 시 <span className="text-[#C46A40] font-medium">서비스 이용약관</span> 및{' '}
            <span className="text-[#C46A40] font-medium">개인정보 처리방침</span>에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
