/**
 * Penyimpanan stub berbasis localStorage yang meniru backend.
 * Semua fungsi di sini adalah titik ganti ke API + Netlify Database
 * pada milestone berikutnya. Hanya dipanggil di sisi browser (di dalam effect / event).
 */
import {
  EXAM,
  SAMPLE_QUESTIONS,
  USERS,
  type ExamInfo,
  type Question,
  type Role,
  type UserAccount,
} from './fixtures'
import { seededShuffle } from './shuffle'

const K = {
  auth: 'ua:auth',
  token: 'ua:token',
  control: 'ua:control',
  questions: 'ua:questions',
  settings: 'ua:settings',
  results: 'ua:results',
  attempt: (u: string) => `ua:attempt:${u}`,
}

const CHANGE_EVENT = 'ua:change'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }))
}

/** Berlangganan perubahan dari tab ini maupun tab lain. */
export function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith('ua:')) cb()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGE_EVENT, cb)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, cb)
  }
}

/* ---------------- Auth ---------------- */

export interface AuthSession {
  username: string
  role: Role
  name: string
  kelas?: string
  loginAt: number
}

/** Mencocokkan username + password lalu menentukan peran secara otomatis. */
export function login(username: string, password: string): AuthSession | null {
  const u = USERS.find(
    (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password,
  )
  if (!u) return null
  const session: AuthSession = {
    username: u.username,
    role: u.role,
    name: u.name,
    kelas: u.kelas,
    loginAt: Date.now(),
  }
  write(K.auth, session)
  return session
}

export const getAuth = () => read<AuthSession | null>(K.auth, null)
export function logout() {
  localStorage.removeItem(K.auth)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: K.auth }))
}

export const getStudents = (): UserAccount[] => USERS.filter((u) => u.role === 'siswa')
export const homeFor = (role: Role) =>
  role === 'admin' ? '/admin' : role === 'pengawas' ? '/pengawas' : '/token'

/* ---------------- Pengaturan ujian ---------------- */

export function getExam(): ExamInfo {
  return { ...EXAM, ...read<Partial<ExamInfo>>(K.settings, {}) }
}
export function saveExamSettings(patch: Partial<ExamInfo>) {
  write(K.settings, { ...read<Partial<ExamInfo>>(K.settings, {}), ...patch })
}

/* ---------------- Token ---------------- */

export interface ExamToken {
  code: string
  issuedAt: number
  expiresAt: number
  issuedBy: string
}

const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join('')
}

export function rotateToken(issuedBy = 'sistem'): ExamToken {
  const now = Date.now()
  const t: ExamToken = {
    code: randomCode(),
    issuedAt: now,
    expiresAt: now + getExam().tokenIntervalMinutes * 60_000,
    issuedBy,
  }
  write(K.token, t)
  return t
}

/** Satu token untuk semua siswa, berlaku 5 menit lalu diganti otomatis. */
export function getActiveToken(): ExamToken {
  const t = read<ExamToken | null>(K.token, null)
  if (!t || t.expiresAt <= Date.now()) return rotateToken()
  return t
}

/* ---------------- Kontrol ujian (jeda / gangguan server) ---------------- */

export interface ExamControl {
  paused: boolean
  reason: string
  by: string
  pausedAt: number | null
  pausedAccumMs: number
}

const defaultControl: ExamControl = {
  paused: false,
  reason: '',
  by: '',
  pausedAt: null,
  pausedAccumMs: 0,
}

export const getControl = () => read<ExamControl>(K.control, defaultControl)

export function pauseExam(reason: string, by: string) {
  const c = getControl()
  if (c.paused) return
  write(K.control, { ...c, paused: true, reason, by, pausedAt: Date.now() })
}

export function resumeExam() {
  const c = getControl()
  if (!c.paused || !c.pausedAt) return
  write(K.control, {
    ...c,
    paused: false,
    reason: '',
    by: '',
    pausedAccumMs: c.pausedAccumMs + (Date.now() - c.pausedAt),
    pausedAt: null,
  })
}

/* ---------------- Bank soal ---------------- */

export const getQuestions = () => read<Question[]>(K.questions, SAMPLE_QUESTIONS)
export const saveQuestions = (qs: Question[]) => write(K.questions, qs)
export const resetQuestions = () => {
  localStorage.removeItem(K.questions)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: K.questions }))
}

/* ---------------- Attempt siswa ---------------- */

export type ViolationType =
  | 'keluar-layar-penuh'
  | 'pindah-tab'
  | 'kehilangan-fokus'
  | 'muat-ulang'
  | 'screenshot'
  | 'pintasan-terlarang'
  | 'kamera-mati'

export interface Violation {
  at: number
  type: ViolationType
  detail: string
}

export interface Attempt {
  username: string
  examId: string
  order: string[]
  optionOrder: Record<string, string[]>
  answers: Record<string, string>
  doubt: Record<string, boolean>
  current: number
  startedAt: number
  durationMs: number
  pauseBaseline: number
  usedTokens: string[]
  entryActive: boolean
  violations: Violation[]
  status: 'active' | 'locked' | 'submitted'
  submittedAt?: number
  lastSeen: number
}

export const getAttempt = (u: string) => read<Attempt | null>(K.attempt(u), null)
export const saveAttempt = (a: Attempt) => write(K.attempt(a.username), { ...a, lastSeen: Date.now() })

export function resetAttempt(username: string) {
  localStorage.removeItem(K.attempt(username))
  write(
    K.results,
    getResults().filter((r) => r.username !== username),
  )
}

export type TokenCheck =
  | { ok: true; attempt: Attempt }
  | { ok: false; reason: string }

/** Validasi token lalu buka sesi masuk. Token yang sudah dipakai siswa yang sama ditolak. */
export function enterWithToken(username: string, code: string): TokenCheck {
  const active = getActiveToken()
  const input = code.trim().toUpperCase()
  if (input !== active.code) {
    return { ok: false, reason: 'Token tidak valid atau sudah kedaluwarsa.' }
  }
  const exam = getExam()
  let a = getAttempt(username)
  if (a?.status === 'submitted') {
    return { ok: false, reason: 'Anda sudah mengumpulkan ujian ini.' }
  }
  if (a?.usedTokens.includes(input)) {
    return {
      ok: false,
      reason: 'Token ini sudah Anda pakai sebelumnya. Minta token baru kepada pengawas.',
    }
  }
  if (!a) {
    const qs = getQuestions()
    const seed = `${username}:${exam.id}`
    const order = exam.shuffleQuestions
      ? seededShuffle(qs.map((q) => q.id), seed)
      : qs.map((q) => q.id)
    const optionOrder: Record<string, string[]> = {}
    for (const q of qs) {
      const keys = q.options.map((x) => x.key)
      optionOrder[q.id] = exam.shuffleOptions ? seededShuffle(keys, `${seed}:${q.id}`) : keys
    }
    a = {
      username,
      examId: exam.id,
      order,
      optionOrder,
      answers: {},
      doubt: {},
      current: 0,
      startedAt: Date.now(),
      durationMs: exam.durationMinutes * 60_000,
      pauseBaseline: getControl().pausedAccumMs,
      usedTokens: [],
      entryActive: false,
      violations: [],
      status: 'active',
      lastSeen: Date.now(),
    }
  }
  a = { ...a, usedTokens: [...a.usedTokens, input], entryActive: true, status: 'active' }
  saveAttempt(a)
  return { ok: true, attempt: a }
}

/** Sisa waktu (ms). Timer tetap berjalan saat siswa keluar, berhenti saat ujian dijeda. */
export function remainingMs(a: Attempt, c: ExamControl, now = Date.now()) {
  const pausedExtra = c.pausedAccumMs - a.pauseBaseline
  const end = a.startedAt + a.durationMs + pausedExtra
  const ref = c.paused && c.pausedAt ? c.pausedAt : now
  return Math.max(0, end - ref)
}

export function recordViolation(username: string, type: ViolationType, detail: string, lock: boolean) {
  const a = getAttempt(username)
  if (!a || a.status === 'submitted') return
  const next: Attempt = {
    ...a,
    violations: [...a.violations, { at: Date.now(), type, detail }],
    ...(lock ? { entryActive: false, status: 'locked' as const } : {}),
  }
  saveAttempt(next)
}

/* ---------------- Hasil ---------------- */

export interface SectionScore {
  section: string
  correct: number
  total: number
}

export interface ExamResult {
  username: string
  name: string
  kelas: string
  examId: string
  examTitle: string
  score: number
  correct: number
  wrong: number
  blank: number
  doubt: number
  total: number
  sections: SectionScore[]
  durationUsedMs: number
  violations: number
  submittedAt: number
  autoSubmitted: boolean
  review: { id: string; section: string; text: string; chosen: string | null; answer: string; correct: boolean }[]
}

export const getResults = () => read<ExamResult[]>(K.results, [])

export function submitAttempt(username: string, autoSubmitted: boolean): ExamResult | null {
  const a = getAttempt(username)
  if (!a) return null
  const user = USERS.find((u) => u.username === username)
  const exam = getExam()
  const qs = getQuestions()
  const byId = new Map(qs.map((q) => [q.id, q]))
  const sections = new Map<string, SectionScore>()
  let correct = 0
  let blank = 0
  const review: ExamResult['review'] = []
  for (const id of a.order) {
    const q = byId.get(id)
    if (!q) continue
    const s = sections.get(q.section) ?? { section: q.section, correct: 0, total: 0 }
    s.total++
    const chosen = a.answers[id] ?? null
    const ok = chosen === q.answer
    const letterOf = (key: string) => 'ABCDE'[a.optionOrder[id]?.indexOf(key) ?? 0] ?? key
    if (!chosen) blank++
    if (ok) {
      correct++
      s.correct++
    }
    sections.set(q.section, s)
    review.push({
      id,
      section: q.section,
      text: q.text,
      chosen: chosen ? `${letterOf(chosen)}. ${q.options.find((x) => x.key === chosen)?.text ?? ''}` : null,
      answer: `${letterOf(q.answer)}. ${q.options.find((x) => x.key === q.answer)?.text ?? ''}`,
      correct: ok,
    })
  }
  const total = review.length
  const now = Date.now()
  const c = getControl()
  const used = Math.min(a.durationMs, a.durationMs - remainingMs(a, c, now))
  const result: ExamResult = {
    username,
    name: user?.name ?? username,
    kelas: user?.kelas ?? '-',
    examId: exam.id,
    examTitle: exam.title,
    score: total ? Math.round((correct / total) * 1000) / 10 : 0,
    correct,
    wrong: total - correct - blank,
    blank,
    doubt: Object.values(a.doubt).filter(Boolean).length,
    total,
    sections: [...sections.values()],
    durationUsedMs: used,
    violations: a.violations.length,
    submittedAt: now,
    autoSubmitted,
    review,
  }
  saveAttempt({ ...a, status: 'submitted', entryActive: false, submittedAt: now })
  write(K.results, [...getResults().filter((r) => r.username !== username), result])
  return result
}
