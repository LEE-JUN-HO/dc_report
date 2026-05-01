// ============================================================
// 인증 화면 — 로그인 / 회원가입 / 대기 안내
// ============================================================
const { useState: useAuthState, useEffect: useAuthEffect } = React;

// ── 에러 메시지 한국어 변환 ─────────────────────────────────
function getAuthErrorMessage(err) {
  if (!err) return '';
  const msg = err.message || String(err);
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (msg.includes('Email not confirmed'))       return '이메일 인증이 필요합니다. 메일함을 확인해주세요.';
  if (msg.includes('User already registered'))   return '이미 가입된 이메일입니다. 로그인해 주세요.';
  if (msg.includes('Password should be'))        return '비밀번호는 6자 이상이어야 합니다.';
  if (msg.includes('rate limit'))                return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (msg.includes('Network'))                   return '네트워크 오류입니다. 인터넷 연결을 확인해주세요.';
  return msg;
}

// ── 공통 카드 레이아웃 ───────────────────────────────────────
function AuthCard({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8FAFC',
      fontFamily: 'Pretendard, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '0 24px',
      }}>
        {/* 브랜드 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--accent, #2563EB)',
            color: 'white',
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: '-0.5px',
            marginBottom: 12,
          }}>RH</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>Resource Hub</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>데이터 컨설팅 리소스 관리</div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── 로그인 화면 ──────────────────────────────────────────────
function LoginScreen({ onSwitchToRegister }) {
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
      // 로그인 성공 → 페이지 새로고침 (supabase-adapter가 세션 감지 후 데이터 로드)
      location.reload();
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    fontSize: 14,
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    background: 'white',
  };
  const focusStyle = { borderColor: 'var(--accent, #2563EB)' };

  return (
    <AuthCard>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '32px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#111827' }}>로그인</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>이메일</label>
            <input
              type="email"
              placeholder="name@bigxdata.io"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
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
              fontSize: 13,
              color: '#DC2626',
              lineHeight: 1.4,
            }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '12px',
              background: loading ? '#93C5FD' : 'var(--accent, #2563EB)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
          계정이 없으신가요?{' '}
          <button onClick={onSwitchToRegister} style={{
            background: 'none', border: 'none', color: 'var(--accent, #2563EB)',
            fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit',
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

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    fontSize: 14,
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: 'white',
  };
  const focusStyle = { borderColor: 'var(--accent, #2563EB)' };

  return (
    <AuthCard>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '32px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#111827' }}>회원가입</h2>
        <p style={{ margin: '0 0 22px', fontSize: 13, color: '#6B7280' }}>
          @bigxdata.io 이메일만 가입 가능합니다. 가입 후 관리자 승인이 필요합니다.
        </p>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>이름</label>
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              disabled={loading}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>이메일</label>
            <input
              type="email"
              placeholder="name@bigxdata.io"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>비밀번호</label>
            <input
              type="password"
              placeholder="6자 이상"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>비밀번호 확인</label>
            <input
              type="password"
              placeholder="비밀번호 재입력"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          {error && (
            <div style={{
              padding: '10px 12px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              fontSize: 13,
              color: '#DC2626',
              lineHeight: 1.4,
            }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '12px',
              background: loading ? '#93C5FD' : 'var(--accent, #2563EB)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? '처리 중…' : '가입 신청'}
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
          이미 계정이 있으신가요?{' '}
          <button onClick={onSwitchToLogin} style={{
            background: 'none', border: 'none', color: 'var(--accent, #2563EB)',
            fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit',
          }}>
            로그인
          </button>
        </div>
      </div>
    </AuthCard>
  );
}

// ── 승인 대기 화면 ───────────────────────────────────────────
function PendingScreen({ profile, onLogout }) {
  return (
    <AuthCard>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '40px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.06)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>⏳</div>
        <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
          {profile?.status === 'rejected' ? '승인이 거절되었습니다' : '승인 대기 중'}
        </h2>
        {profile?.status === 'rejected' ? (
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, margin: '0 0 24px' }}>
            계정 승인이 거절되었습니다.<br />
            문의사항은 관리자에게 연락해주세요.
          </p>
        ) : (
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, margin: '0 0 24px' }}>
            가입 신청이 완료되었습니다.<br />
            관리자 승인 후 서비스를 이용하실 수 있습니다.<br />
            승인 완료 시 다시 로그인해주세요.
          </p>
        )}
        {profile?.email && (
          <div style={{
            padding: '10px 16px',
            background: '#F3F4F6',
            borderRadius: 8,
            fontSize: 13,
            color: '#6B7280',
            marginBottom: 24,
          }}>
            {profile.email}
          </div>
        )}
        <button
          onClick={onLogout}
          style={{
            padding: '10px 24px',
            background: 'none',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 14,
            color: '#374151',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          로그아웃
        </button>
      </div>
    </AuthCard>
  );
}

// ── 로딩 화면 ────────────────────────────────────────────────
function AuthLoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8FAFC',
      flexDirection: 'column',
      gap: 16,
      fontFamily: 'Pretendard, -apple-system, sans-serif',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'var(--accent, #2563EB)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 17,
      }}>RH</div>
      <div style={{ fontSize: 14, color: '#9CA3AF' }}>불러오는 중…</div>
    </div>
  );
}

// ── 가입 완료 안내 화면 ──────────────────────────────────────
function RegisteredScreen({ onGoLogin }) {
  return (
    <AuthCard>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '40px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.06)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#111827' }}>가입 신청 완료</h2>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, margin: '0 0 24px' }}>
          관리자 승인 후 로그인하실 수 있습니다.<br />
          승인이 완료되면 로그인 버튼을 눌러주세요.
        </p>
        <button
          onClick={onGoLogin}
          style={{
            padding: '11px 28px',
            background: 'var(--accent, #2563EB)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          로그인으로 이동
        </button>
      </div>
    </AuthCard>
  );
}

// ── 메인 AuthView (상태 라우터) ──────────────────────────────
function AuthView({ authState, onLogout }) {
  const [screen, setScreen] = useAuthState('login'); // 'login' | 'register' | 'registered'

  // pending/rejected 상태
  if (authState?.status === 'pending' || authState?.status === 'rejected') {
    return <PendingScreen profile={authState.profile} onLogout={onLogout} />;
  }

  if (screen === 'registered') {
    return <RegisteredScreen onGoLogin={() => setScreen('login')} />;
  }
  if (screen === 'register') {
    return <RegisterScreen
      onSwitchToLogin={() => setScreen('login')}
      onRegistered={() => setScreen('registered')}
    />;
  }
  return <LoginScreen onSwitchToRegister={() => setScreen('register')} />;
}

Object.assign(window, { AuthView, AuthLoadingScreen });
