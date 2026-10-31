import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { request, RequestError } from './api'
import { BrandLogo } from './BrandLogo'
import type { Session } from './domain'

const AccountContext = createContext<{ session: Session; logout: () => Promise<void> } | null>(null)
export function useAccount() {
  const value = useContext(AccountContext)
  if (!value) throw new Error('로그인 후 이용해 주세요.')
  return value
}
export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  async function check(signal?: AbortSignal) {
    setChecking(true); setError('')
    try { setSession(await request<Session>('/session', { signal })) }
    catch (e) { if (!signal?.aborted && !(e instanceof RequestError && e.status === 401)) setError((e as Error).message) }
    finally { if (!signal?.aborted) setChecking(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    const expired = () => setSession(null)
    window.addEventListener('crbu:unauthorized', expired)
    void check(controller.signal)
    return () => { controller.abort(); window.removeEventListener('crbu:unauthorized', expired) }
  }, [])
  async function logout() {
    await request('/auth/logout', { method: 'POST', body: {} })
    setSession(null)
  }
  if (checking || error) return <div className="mobile-frame"><div className="mobile-scroll"><main className="account-page"><div className="manager-brand"><BrandLogo size={38} /><b>CRBU</b></div><h1>{error ? '연결을 확인해 주세요' : '잠시만 기다려 주세요'}</h1>{error && <><p role="alert">{error}</p><button className="account-submit" onClick={() => void check()}>다시 시도</button></>}</main></div></div>
  if (!session) return <AccountForm onLogin={setSession} />
  return <AccountContext.Provider value={{ session, logout }}><div key={session.userId}>{children}</div></AccountContext.Provider>
}

function AccountForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<'manager' | 'sv'>('manager')
  const [storeId, setStoreId] = useState('')
  const [stores, setStores] = useState<{store_id: string; store_name: string}[]>([])
  const [storesError, setStoresError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function loadStores(signal?: AbortSignal) {
    setStoresError('')
    try { setStores(await request<typeof stores>('/auth/stores', { signal })) }
    catch (e) { if (!signal?.aborted) setStoresError((e as Error).message) }
  }
  useEffect(() => { const controller = new AbortController(); void loadStores(controller.signal); return () => controller.abort() }, [])
  function changeMode(next: 'login' | 'signup') { setMode(next); setPassword(''); setConfirm(''); setError(''); setNotice('') }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(''); setNotice('')
    if (mode === 'signup' && password !== confirm) { setError('비밀번호가 일치하지 않아요.'); return }
    setBusy(true)
    try {
      if (mode === 'signup') {
        await request('/auth/signup', { method: 'POST', body: { username, password, role, storeId } })
        setMode('login'); setPassword(''); setConfirm(''); setNotice('회원가입이 완료됐어요. 가입한 아이디로 로그인해 주세요.')
      } else onLogin(await request<Session>('/auth/login', { method: 'POST', body: { username, password } }))
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  return <div className="mobile-frame"><div className="mobile-scroll"><main className="account-page">
    <div className="manager-brand"><BrandLogo size={42} /><b>CRBU</b></div>
    <div className="account-heading"><p>매일의 운영을 더 편하게</p><h1>{mode === 'login' ? '로그인' : '회원가입'}</h1><span>{mode === 'login' ? '우리 매장에 필요한 업무를 한눈에 확인하세요.' : '계정을 만들고 매장 관리를 시작하세요.'}</span></div>
    <form className="account-form" onSubmit={submit} aria-label={mode === 'login' ? '로그인' : '회원가입'}>
      <fieldset disabled={busy}>
        <label>아이디<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={2} maxLength={32} value={username} onChange={e => setUsername(e.target.value)} placeholder="아이디를 입력하세요" />{mode === 'signup' && <small>한글, 영문, 숫자, . _ - · 2~32자</small>}</label>
        <label>비밀번호<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? '8자 이상 입력하세요' : '비밀번호를 입력하세요'} /></label>
        {mode === 'signup' && <>
          <label>비밀번호 확인<input name="confirmPassword" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="비밀번호를 한 번 더 입력하세요" /></label>
          <label>역할<select name="role" value={role} onChange={e => setRole(e.target.value as 'manager' | 'sv')}><option value="manager">점장</option><option value="sv">SV · 슈퍼바이저</option></select></label>
          {role === 'manager' && <label>담당 매장<select name="storeId" required value={storeId} onChange={e => setStoreId(e.target.value)}><option value="">매장을 선택하세요</option>{stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}</select></label>}
          {role === 'manager' && storesError && <div className="account-error" role="alert">{storesError}<button type="button" onClick={() => void loadStores()}>매장 다시 불러오기</button></div>}
        </>}
        {error && <p className="account-error" role="alert">{error}</p>}
        {notice && <p className="account-notice" role="status">{notice}</p>}
        <button className="account-submit" type="submit">{busy ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}</button>
      </fieldset>
    </form>
    <p className="account-alternative">{mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'} <button disabled={busy} onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? '회원가입' : '로그인'}</button></p>
  </main></div></div>
}
