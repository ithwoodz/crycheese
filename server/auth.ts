import { createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient, type Session as AuthSession, type User } from '@supabase/supabase-js'
import type { Session } from '../src/domain.js'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function accountName(value: unknown) {
  const name = String(value ?? '').normalize('NFKC').trim().toLowerCase()
  if (!/^[a-z0-9가-힣][a-z0-9가-힣._-]{1,31}$/.test(name))
    throw new ApiError(400, '아이디는 한글, 영문, 숫자와 . _ - 를 사용해 2~32자로 입력하세요.')
  return name
}
export function accountEmail(name: string) {
  // Username login uses a private deterministic Auth identity; no email delivery is needed.
  return `${createHash('sha256').update(name).digest('hex')}@accounts.crycheese.invalid`
}
export function accountSession(user: User): Session {
  const { role, store_id: storeId, username } = user.app_metadata
  if (!['manager', 'sv'].includes(role) || !['S01', 'S02', 'S03'].includes(storeId) || !username)
    throw new ApiError(403, '계정 정보를 확인할 수 없습니다. 관리자에게 문의해 주세요.')
  return { role, storeId, userId: user.id, username }
}

export function createAccountAuth(env: Record<string, string>) {
  const base = env.SUPABASE_URL || ''
  const key = env.SUPABASE_SECRET_KEY || ''
  const client = () => {
    if (!base || !key) throw new ApiError(503, '로그인 서비스를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
    return createClient(base, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  }
  const cookies = (req: IncomingMessage) => Object.fromEntries((req.headers.cookie || '').split(';').map(v => {
    const i = v.indexOf('='); return [v.slice(0, i).trim(), v.slice(i + 1)]
  }))
  function setCookies(res: ServerResponse, session: AuthSession | null) {
    const flags = `HttpOnly; SameSite=Lax; Path=/${env.VERCEL ? '; Secure' : ''}`
    res.setHeader('Set-Cookie', [
      `crbu_access=${session?.access_token || ''}; ${flags}; Max-Age=${session ? session.expires_in : 0}`,
      `crbu_refresh=${session?.refresh_token || ''}; ${flags}; Max-Age=${session ? 60 * 60 * 24 * 30 : 0}`,
      'runn_review=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
    ])
  }
  // Coalesce simultaneous refreshes, including React's initial repeated requests.
  const refreshing = new Map<string, Promise<AuthSession>>()
  async function read(req: IncomingMessage, res: ServerResponse): Promise<Session> {
    const saved = cookies(req)
    if (saved.crbu_access) {
      const { data, error } = await client().auth.getUser(saved.crbu_access)
      if (!error && data.user) return accountSession(data.user)
      if (error && error.status && error.status >= 500) throw new ApiError(503, '로그인 상태를 확인하지 못했어요. 다시 시도해 주세요.')
    }
    if (saved.crbu_refresh) {
      let task = refreshing.get(saved.crbu_refresh)
      if (!task) {
        task = (async () => {
          const { data, error } = await client().auth.refreshSession({ refresh_token: saved.crbu_refresh })
          if (error || !data.session) throw new ApiError(error?.status && error.status >= 500 ? 503 : 401, '다시 로그인해 주세요.')
          return data.session
        })()
        refreshing.set(saved.crbu_refresh, task)
      }
      try {
        const renewed = await task
        setCookies(res, renewed)
        return accountSession(renewed.user)
      } finally { refreshing.delete(saved.crbu_refresh) }
    }
    throw new ApiError(401, '로그인 후 이용해 주세요.')
  }
  // Additional per-process protection; Supabase also throttles password login.
  const attempts = new Map<string, { count: number; until: number }>()
  function limit(req: IncomingMessage, operation: string) {
    const now = Date.now()
    for (const [id, value] of attempts) if (value.until < now) attempts.delete(id)
    const ip = env.VERCEL ? String(req.headers['x-real-ip'] || req.socket.remoteAddress) : req.socket.remoteAddress
    const id = `${operation}:${ip}`
    const value = attempts.get(id) || { count: 0, until: now + 600000 }
    if (++value.count > (operation === 'signup' ? 10 : 30)) throw new ApiError(429, '시도가 너무 많아요. 잠시 후 다시 시도해 주세요.')
    attempts.set(id, value)
  }
  async function signup(req: IncomingMessage, payload: Record<string, unknown>) {
    limit(req, 'signup')
    const username = accountName(payload.username)
    const password = payload.password
    if (typeof password !== 'string' || password.length < 8 || password.length > 128)
      throw new ApiError(400, '비밀번호는 8~128자로 입력하세요.')
    const role = payload.role
    const storeId = role === 'sv' ? 'S03' : payload.storeId
    if (!['manager', 'sv'].includes(String(role)) || !['S01', 'S02', 'S03'].includes(String(storeId)))
      throw new ApiError(400, '역할과 담당 매장을 선택해 주세요.')
    const { error } = await client().auth.admin.createUser({ email: accountEmail(username), password, email_confirm: true,
      app_metadata: { username, role, store_id: storeId } })
    if (error) {
      if (['email_exists', 'user_already_exists'].includes(error.code || '')) throw new ApiError(409, '이미 사용 중인 아이디예요.')
      if (error.code === 'weak_password') throw new ApiError(400, '더 안전한 비밀번호를 입력해 주세요.')
      throw new ApiError(503, '회원가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
    return { created: true }
  }
  async function login(req: IncomingMessage, res: ServerResponse, payload: Record<string, unknown>) {
    limit(req, 'login')
    const username = accountName(payload.username)
    if (typeof payload.password !== 'string' || !payload.password || payload.password.length > 128)
      throw new ApiError(400, '아이디와 비밀번호를 입력해 주세요.')
    const { data, error } = await client().auth.signInWithPassword({ email: accountEmail(username), password: payload.password })
    if (error || !data.session) throw new ApiError(error?.status === 429 ? 429 : 401, error?.status === 429 ? '잠시 후 다시 로그인해 주세요.' : '아이디 또는 비밀번호를 확인해 주세요.')
    const session = accountSession(data.user)
    setCookies(res, data.session)
    return session
  }
  async function logout(req: IncomingMessage, res: ServerResponse) {
    const token = cookies(req).crbu_access
    if (token) await client().auth.admin.signOut(token, 'local')
    setCookies(res, null)
    return { signedOut: true }
  }
  return { read, signup, login, logout }
}
