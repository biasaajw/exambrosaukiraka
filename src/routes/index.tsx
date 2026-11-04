import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Camera,
  Clock4,
  KeyRound,
  Loader2,
  Lock,
  Maximize,
  Shuffle,
  UserRound,
  Volume2,
} from 'lucide-react'
import { Brand } from '@/components/exam/brand'
import { PasswordInput, fieldClass } from '@/components/exam/password-input'
import { getAuth, homeFor, login } from '@/lib/exam-store'
import { USERS } from '@/lib/fixtures'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

const roleLabel = { admin: 'Admin', pengawas: 'Pengawas', siswa: 'Siswa' } as const

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const reason = sessionStorage.getItem('ua:logout-reason')
    if (reason) {
      setNotice(reason)
      sessionStorage.removeItem('ua:logout-reason')
    }
    const a = getAuth()
    if (a && a.role !== 'siswa') void navigate({ to: homeFor(a.role) })
  }, [navigate])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Isi username dan sandi terlebih dahulu.')
      setShakeKey((k) => k + 1)
      return
    }
    setLoading(true)
    // Peran ditentukan otomatis dari akun — tidak ada tombol pilih peran.
    setTimeout(() => {
      const s = login(username, password)
      setLoading(false)
      if (!s) {
        setError('Username atau sandi salah.')
        setShakeKey((k) => k + 1)
        return
      }
      void navigate({ to: homeFor(s.role) })
    }, 350)
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-content">
        <header className="mb-6 flex items-center justify-between lg:mb-10">
          <Brand />
          <span className="neu-sm hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-success" /> Server ujian normal
          </span>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
          {/* Bento: fitur keamanan */}
          <section aria-labelledby="hero-title" className="grid auto-rows-[minmax(0,auto)] grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
            <div className="neu animate-rise col-span-2 p-6 sm:col-span-4 sm:p-8">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                <Lock className="size-3.5" /> Mode ujian terkunci
              </p>
              <h1 id="hero-title" className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
                Ujian online yang jujur, fokus, dan tanpa celah mencontek.
              </h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Layar penuh dikunci, tab lain diblokir, kamera aktif, dan setiap keluar dari mode aman
                wajib login ulang dengan token baru dari pengawas.
              </p>
            </div>
            <Feature className="col-span-1 sm:col-span-2" icon={Maximize} title="Layar penuh terkunci" text="Keluar layar penuh atau pindah tab langsung mengunci sesi & membunyikan alarm." delay={60} />
            <Feature icon={Camera} title="Kamera aktif" text="Modul kamera tampil selama pengerjaan." delay={110} />
            <Feature icon={KeyRound} title="Token 5 menit" text="Satu token untuk semua, diganti berkala." delay={160} />
            <Feature icon={Shuffle} title="Soal diacak" text="Urutan soal & opsi berbeda tiap siswa." delay={210} />
            <Feature icon={Clock4} title="Timer adil" text="Berhenti saat gangguan server." delay={260} />
            <Feature className="col-span-2" icon={Volume2} title="Alarm & volume aktif" text="Bunyi peringatan saat ada upaya keluar paksa, screenshot, atau pintasan terlarang." delay={310} />
          </section>

          {/* Kartu login */}
          <section aria-labelledby="login-title" className="neu animate-rise self-start p-6 sm:p-8" style={{ animationDelay: '80ms' }}>
            <h2 id="login-title" className="text-2xl font-extrabold tracking-tight">Masuk</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cukup username dan sandi — sistem otomatis mengenali Anda sebagai siswa, pengawas, atau admin.
            </p>

            {notice && (
              <div role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {notice}
              </div>
            )}

            <form key={shakeKey} onSubmit={onSubmit} className={cn('mt-6 space-y-4', shakeKey > 0 && error && 'animate-shake')} noValidate>
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-semibold">Username</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="contoh: siswa01"
                    className={cn(fieldClass, 'pl-11')}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold">Sandi</label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan sandi"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground shadow-[0_8px_20px_-8px_var(--primary)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : <>Masuk <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></>}
              </button>
            </form>

            <details className="mt-6 rounded-xl neu-inset px-4 py-3 text-sm">
              <summary className="cursor-pointer font-semibold text-muted-foreground">Akun percobaan</summary>
              <ul className="mt-3 space-y-1.5">
                {USERS.slice(0, 4).map((u) => (
                  <li key={u.username}>
                    <button
                      type="button"
                      onClick={() => {
                        setUsername(u.username)
                        setPassword(u.password)
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card"
                    >
                      <span className="font-mono text-xs">{u.username} / {u.password}</span>
                      <span className="text-xs text-muted-foreground">{roleLabel[u.role]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </div>
      </div>
    </main>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
  className,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
  className?: string
  delay?: number
}) {
  return (
    <div className={cn('neu animate-rise p-4 sm:p-5', className)} style={{ animationDelay: `${delay}ms` }}>
      <span className="neu-inset mb-3 grid size-10 place-items-center rounded-xl text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}
