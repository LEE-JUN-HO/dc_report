// ============================================================
// 인증 화면 — 로그인 / 회원가입 / 대기 안내
// ============================================================
const { useState: useAuthState, useEffect: useAuthEffect } = React;

// ── 뷰포트를 반응형으로 전환 (로그인 화면에서만) ─────────────
function useResponsiveViewport() {
  useAuthEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta ? meta.getAttribute('content') : '';
    if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
    return () => { if (meta && original) meta.setAttribute('content', original); };
  }, []);

  const [isMobile, setIsMobile] = useAuthState(() => window.innerWidth < 480);
  useAuthEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── 에러 메시지 한국어 변환 ─────────────────────────────────
function getAuthErrorMessage(err) {
  if (!err) return '';
  const msg = err.message || String(err);
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (msg.includes('Email not confirmed'))       return '이메일 인증이 필요합니다. 메일함을 확인해주세요.';
  if (msg.includes('User already registered'))   return '이미 가입된 이메일입니다. 로그인해 주세요.';
  if (msg.includes('Password should be'))        return '비밀번호는 6자 이상이어야 합니다.';
  if (msg.includes('Email logins are disabled')) return '이메일 로그인이 비활성화되어 있습니다. Supabase 설정을 확인해주세요.';
  if (msg.includes('rate limit'))                return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (msg.includes('Network'))                   return '네트워크 오류입니다. 인터넷 연결을 확인해주세요.';
  return msg;
}

// ── 공통 카드 레이아웃 ───────────────────────────────────────
function AuthCard({ children, isMobile }) {
  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'center',
      background: '#F8FAFC',
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
      padding: isMobile ? '40px 0 32px' : '0',
    }}>
      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 400,
        padding: isMobile ? '0 20px' : '0 24px',
      }}>
        {/* 브랜드 */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 24 : 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? 52 : 48,
            height: isMobile ? 52 : 48,
            borderRadius: 14,
            background: 'var(--accent, #2563EB)',
            color: 'white',
            fontWeight: 800,
            fontSize: isMobile ? 22 : 20,
            letterSpacing: '-0.5px',
            marginBottom: 12,
          }}>RH</div>
          <div style={{ fontSize: isMobile ? 24 : 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>Resource Hub</div>
          <div style={{ fontSize: isMobile ? 14 : 13, color: '#6B7280', marginTop: 4 }}>데이터 컨설팅 리소스 관리</div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── 공통 인풋 스타일 ─────────────────────────────────────────
function authInputStyle(isMobile) {
  return {
    width: '100%',
    padding: isMobile ? '14px 16px' : '11px 14px',
    fontSize: isMobile ? 16 : 14,  // 16px → iOS 자동 확대 방지
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: 'white',
    WebkitAppearance: 'none',
  };
}

function authCardStyle(isMobile) {
  return {
    background: 'white',
    borderRadius: isMobile ? 16 : 16,
    padding: isMobile ? '28px 20px' : '32px 28px',
    boxShadow: isMobile
      ? '0 2px 12px rgba(0,0,0,0.08)'
      : '0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.06)',
  };
}

function authButtonStyle(loading, isMobile) {
  return {
    marginTop: 6,
    padding: isMobile ? '15px' : '12px',
    background: loading ? '#93C5FD' : 'var(--accent, #2563EB)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: isMobile ? 16 : 14,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    width: '100%',
    WebkitTapHighlightColor: 'transparent',
  };
}

// ── 로그인 화면 ──────────────────────────────────────────────
function LoginScreen({ onSwitchToRegister }) {
  const isMobile = useResponsiveViewport();
  const [email, setEmail]       = useAuthState('');
  const [password, setPassword] = useAuthState('');
  const [loading, setLoading]   = useAuthState(false);
  const [error, setError]       = useAuthState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return; }
    setLoading(true);
    try {
      const client = window.__SUPABASE_AUTH_CLIENT__;
      if (!client) throw new Error('Supabase 클라이언트가 준비되지 않았습니다.');
      const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
      location.reload();
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const iStyle = authInputStyle(isMobile);
  const focusColor = 'var(--accent, #2563EB)';
  const labelStyle = { display: 'block', fontSize: isMobile ? 14 : 13, fontWeight: 500, color: '#374151', marginBottom: 7 };

  return (
    <AuthCard isMobile={isMobile}>
      <div style={authCardStyle(isMobile)}>
        <h2 style={{ margin: '0 0 22px', fontSize: isMobile ? 20 : 18, fontWeight: 700, color: '#111827' }}>로그인</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 14 }}>
          <div>
            <label style={labelStyle}>이메일</label>
            <input
              type="email"
              placeholder="name@bigxdata.io"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={iStyle}
              onFocus={e => e.target.style.borderColor = focusColor}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="email"
              disabled={loading}
              inputMode="email"
            />
          </div>
          <div>
            <label style={labelStyle}>비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={iStyle}
              onFocus={e => e.target.style.borderColor = focusColor}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {error && (
            <div style={{
              padding: '10px 12px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              fontSize: isMobile ? 14 : 13,
              color: '#DC2626',
              lineHeight: 1.5,
            }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={authButtonStyle(loading, isMobile)}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <div style={{ marginTop: isMobile ? 22 : 20, textAlign: 'center', fontSize: isMobile ? 14 : 13, color: '#6B7280' }}>
          계정이 없으신가요?{' '}
          <button onClick={onSwitchToRegister} style={{
            background: 'none', border: 'none', color: 'var(--accent, #2563EB)',
            fontWeight: 600, cursor: 'pointer', fontSize: isMobile ? 14 : 13,
            padding: '4px 2px', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
          }}>
            회원가입
          </button>
        </div>
      </div>
    </AuthCard>
  );
}

// ── 회원가입 화면 ────────────────────────────────────────────
function RegisterScreen({ onSwitchToLogin, onRegistered }) {
  const isMobile = useResponsiveViewport();
  const [name, setName]         = useAuthState('');
  const [email, setEmail]       = useAuthState('');
  const [password, setPassword] = useAuthState('');
  const [confirm, setConfirm]   = useAuthState('');
  const [loading, setLoading]   = useAuthState(false);
  const [error, setError]       = useAuthState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim())  { setError('이름을 입력해주세요.'); return; }
    if (!email)        { setError('이메일을 입력해주세요.'); return; }
    if (!email.endsWith('@bigxdata.io')) {
      setError('@bigxdata.io 이메일만 가입할 수 있습니다.');
      return;
    }
    if (!password)     { setError('비밀번호를 입력해주세요.'); return; }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return; }

    setLoading(true);
    try {
      const client = window.__SUPABASE_AUTH_CLIENT__;
      if (!client) throw new Error('Supabase 클라이언트가 준비되지 않았습니다.');
      const { error: signUpErr } = await client.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } },
      });
      if (signUpErr) throw signUpErr;
      onRegistered();
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const iStyle = authInputStyle(isMobile);
  const focusColor = 'var(--accent, #2563EB)';
  const labelStyle = { display: 'block', fontSize: isMobile ? 14 : 13, fontWeight: 500, color: '#374151', marginBottom: 7 };

  return (
    <AuthCard isMobile={isMobile}>
      <div style={authCardStyle(isMobile)}>
        <h2 style={{ margin: '0 0 6px', fontSize: isMobile ? 20 : 18, fontWeight: 700, color: '#111827' }}>회원가입</h2>
        <p style={{ margin: '0 0 20px', fontSize: isMobile ? 13 : 13, color: '#6B7280', lineHeight: 1.5 }}>
          @bigxdata.io 이메일만 가입 가능합니다.<br />가입 후 관리자 승인이 필요합니다.
        </p>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 14 }}>
          <div>
            <label style={labelStyle}>이름</label>
            <input type="text" placeholder="홍길동" value={name} onChange={e => setName(e.target.value)}
              style={iStyle}
              onFocus={e => e.target.style.borderColor = focusColor}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              disabled={loading} autoComplete="name" />
          </div>
          <div>
            <label style={labelStyle}>이메일</label>
            <input type="email" placeholder="name@bigxdata.io" value={email} onChange={e => setEmail(e.target.value)}
              style={iStyle}
              onFocus={e => e.target.style.borderColor = focusColor}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="email" disabled={loading} inputMode="email" />
          </div>
          <div>
            <label style={labelStyle}>비밀번호</label>
            <input type="password" placeholder="6자 이상" value={password} onChange={e => setPassword(e.target.value)}
              style={iStyle}
              onFocus={e => e.target.style.borderColor = focusColor}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="new-password" disabled={loading} />
          </div>
          <div>
            <label style={labelStyle}>비밀번호 확인</label>
            <input type="password" placeholder="비밀번호 재입력" value={confirm} onChange={e => setConfirm(e.target.value)}
              style={iStyle}
              onFocus={e => e.target.style.borderColor = focusColor}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="new-password" disabled={loading} />
          </div>
          {error && (
            <div style={{
              padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, fontSize: isMobile ? 14 : 13, color: '#DC2626', lineHeight: 1.5,
            }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={authButtonStyle(loading, isMobile)}>
            {loading ? '처리 중…' : '가입 신청'}
          </button>
        </form>
        <div style={{ marginTop: isMobile ? 22 : 20, textAlign: 'center', fontSize: isMobile ? 14 : 13, color: '#6B7280' }}>
          이미 계정이 있으신가요?{' '}
          <button onClick={onSwitchToLogin} style={{
            background: 'none', border: 'none', color: 'var(--accent, #2563EB)',
            fontWeight: 600, cursor: 'pointer', fontSize: isMobile ? 14 : 13,
            padding: '4px 2px', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
          }}>
            로그인
          </button>
        </div>
      </div>
    </AuthCard>
  );
}

// ── 승인 대기 / 거절 화면 ────────────────────────────────────
function PendingScreen({ profile, onLogout }) {
  const isMobile = useResponsiveViewport();
  const rejected = profile?.status === 'rejected';
  return (
    <AuthCard isMobile={isMobile}>
      <div style={{ ...authCardStyle(isMobile), textAlign: 'center' }}>
        <div style={{ fontSize: isMobile ? 52 : 44, marginBottom: 16 }}>{rejected ? '🚫' : '⏳'}</div>
        <h2 style={{ margin: '0 0 10px', fontSize: isMobile ? 20 : 18, fontWeight: 700, color: '#111827' }}>
          {rejected ? '승인이 거절되었습니다' : '승인 대기 중'}
        </h2>
        {rejected ? (
          <p style={{ fontSize: isMobile ? 14 : 14, color: '#6B7280', lineHeight: 1.7, margin: '0 0 24px' }}>
            계정 승인이 거절되었습니다.<br />문의사항은 관리자에게 연락해주세요.
          </p>
        ) : (
          <p style={{ fontSize: isMobile ? 14 : 14, color: '#6B7280', lineHeight: 1.7, margin: '0 0 24px' }}>
            가입 신청이 완료되었습니다.<br />
            관리자 승인 후 서비스를 이용하실 수 있습니다.<br />
            승인 완료 시 다시 로그인해 주세요.
          </p>
        )}
        {profile?.email && (
          <div style={{
            padding: '10px 16px', background: '#F3F4F6', borderRadius: 8,
            fontSize: isMobile ? 14 : 13, color: '#6B7280', marginBottom: 24,
          }}>{profile.email}</div>
        )}
        <button onClick={onLogout} style={{
          padding: isMobile ? '13px 32px' : '10px 24px',
          background: 'none', border: '1px solid #E5E7EB', borderRadius: 10,
          fontSize: isMobile ? 15 : 14, color: '#374151', cursor: 'pointer',
          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
        }}>로그아웃</button>
      </div>
    </AuthCard>
  );
}

// ── 로딩 화면 ────────────────────────────────────────────────
function AuthLoadingScreen() {
  useAuthEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta ? meta.getAttribute('content') : '';
    if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1');
    return () => { if (meta && original) meta.setAttribute('content', original); };
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FAFC', flexDirection: 'column', gap: 16,
      fontFamily: 'Pretendard, -apple-system, sans-serif',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'var(--accent, #2563EB)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 18,
      }}>RH</div>
      <div style={{ fontSize: 14, color: '#9CA3AF' }}>불러오는 중…</div>
    </div>
  );
}

// ── 가입 완료 안내 화면 ──────────────────────────────────────
function RegisteredScreen({ onGoLogin }) {
  const isMobile = useResponsiveViewport();
  return (
    <AuthCard isMobile={isMobile}>
      <div style={{ ...authCardStyle(isMobile), textAlign: 'center' }}>
        <div style={{ fontSize: isMobile ? 52 : 44, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: '0 0 10px', fontSize: isMobile ? 20 : 18, fontWeight: 700, color: '#111827' }}>가입 신청 완료</h2>
        <p style={{ fontSize: isMobile ? 14 : 14, color: '#6B7280', lineHeight: 1.7, margin: '0 0 24px' }}>
          관리자 승인 후 로그인하실 수 있습니다.<br />
          승인이 완료되면 로그인 버튼을 눌러주세요.
        </p>
        <button onClick={onGoLogin} style={{
          padding: isMobile ? '13px 32px' : '11px 28px',
          background: 'var(--accent, #2563EB)', color: 'white', border: 'none',
          borderRadius: 10, fontSize: isMobile ? 15 : 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
        }}>로그인으로 이동</button>
      </div>
    </AuthCard>
  );
}

// ── 메인 AuthView ────────────────────────────────────────────
function AuthView({ authState, onLogout }) {
  const [screen, setScreen] = useAuthState('login');

  if (authState?.status === 'pending' || authState?.status === 'rejected') {
    return <PendingScreen profile={authState.profile} onLogout={onLogout} />;
  }
  if (screen === 'registered') return <RegisteredScreen onGoLogin={() => setScreen('login')} />;
  if (screen === 'register')   return <RegisterScreen onSwitchToLogin={() => setScreen('login')} onRegistered={() => setScreen('registered')} />;
  return <LoginScreen onSwitchToRegister={() => setScreen('register')} />;
}

Object.assign(window, { AuthView, AuthLoadingScreen });
