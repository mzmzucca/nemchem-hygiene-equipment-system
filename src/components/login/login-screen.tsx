"use client"

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  Handshake,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react"
import {
  loginDictionaries,
  LOGIN_LANG_STORAGE_KEY,
  type LoginKey,
  type LoginLang,
} from "@/lib/i18n/login-dictionaries"

/**
 * Full-screen authentication screen for NemChem.
 *
 * Visual design follows the approved reference (FIMS-style split layout):
 * left panel = brand identity over a blue-washed hygiene photo with waves,
 * right panel = white card with the sign-in form. Mobile gets its own
 * compact arrangement (header + compact benefits + card) preserving the
 * same identity.
 *
 * Authentication reuses the existing NextAuth credentials provider — no
 * logic is duplicated. No demo credentials are shown on this screen.
 */

/* ---------------- i18n (shares storage with the landing page) -------------- */

function readPreferredLang(): LoginLang {
  if (typeof window === "undefined") return "pt"
  try {
    const param = new URLSearchParams(window.location.search).get("lang")
    if (param === "en" || param === "pt") return param
    const stored = window.localStorage.getItem(LOGIN_LANG_STORAGE_KEY)
    if (stored === "en" || stored === "pt") return stored
  } catch {
    // storage unavailable — fall through to default
  }
  return "pt"
}

const langListeners = new Set<() => void>()
let clientLang: LoginLang | null = null

function subscribeLang(onChange: () => void) {
  langListeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    langListeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

function getLangSnapshot(): LoginLang {
  if (clientLang === null) clientLang = readPreferredLang()
  return clientLang
}

function getServerLang(): LoginLang {
  return "pt"
}

function useLoginLang() {
  const lang = useSyncExternalStore(subscribeLang, getLangSnapshot, getServerLang)
  const setLang = useCallback((next: LoginLang) => {
    clientLang = next
    try {
      window.localStorage.setItem(LOGIN_LANG_STORAGE_KEY, next)
    } catch {
      // ignore
    }
    langListeners.forEach((notify) => notify())
  }, [])
  const t = useCallback(
    (key: LoginKey) => {
      const dict = loginDictionaries[lang] as Record<string, string>
      const fallback = loginDictionaries.pt as Record<string, string>
      return dict[key] ?? fallback[key] ?? key
    },
    [lang]
  )
  return { lang, setLang, t }
}

/* ------------------------------- language menu ----------------------------- */

function LanguageMenu({
  lang,
  setLang,
  onDark,
  label,
}: {
  lang: LoginLang
  setLang: (lang: LoginLang) => void
  onDark?: boolean
  label: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      {open && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 cursor-default"
        />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={
          onDark
            ? "flex h-11 items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3.5 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            : "flex h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        }
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {lang.toUpperCase()}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-40 mt-2 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {(Object.keys(loginDictionaries) as LoginLang[]).map((code) => (
            <li key={code} role="option" aria-selected={code === lang}>
              <button
                type="button"
                onClick={() => {
                  setLang(code)
                  setOpen(false)
                }}
                className={`flex w-full items-center px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${
                  code === lang ? "font-semibold text-blue-700" : "text-slate-600"
                }`}
              >
                {code === "pt" ? "Português" : "English"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* --------------------------------- benefits -------------------------------- */

function Benefits({ compact = false }: { compact?: boolean }) {
  const { t } = useLoginLang()
  const items = [
    { icon: ShieldCheck, key: "login.benefit1" as LoginKey },
    { icon: BarChart3, key: "login.benefit2" as LoginKey },
    { icon: Handshake, key: "login.benefit3" as LoginKey },
  ]
  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2 px-1">
        {items.map(({ icon: Icon, key }) => (
          <div key={key} className="flex flex-col items-center gap-1.5 text-center">
            <Icon className="h-5 w-5 text-cyan-300" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[11px] leading-tight text-blue-50">{t(key)}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid max-w-xl grid-cols-3">
      {items.map(({ icon: Icon, key }, i) => (
        <div
          key={key}
          className={`flex flex-col items-center gap-2.5 px-4 text-center ${
            i > 0 ? "border-l border-white/25" : ""
          }`}
        >
          <Icon className="h-8 w-8 text-white" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm leading-snug text-white/90">{t(key)}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------ wave decoration ---------------------------- */

function Waves() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true">
      <svg
        className="h-28 w-full sm:h-36"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,140 C240,60 480,220 760,180 C1040,140 1240,40 1440,110 L1440,220 L0,220 Z"
          fill="#38bdf8"
          fillOpacity="0.25"
        />
        <path
          d="M0,180 C300,110 620,230 920,190 C1180,156 1330,90 1440,130 L1440,220 L0,220 Z"
          fill="#1e5fd6"
          fillOpacity="0.45"
        />
        <path
          d="M0,205 C360,160 760,240 1100,205 C1260,188 1380,165 1440,175 L1440,220 L0,220 Z"
          fill="#16337a"
          fillOpacity="0.55"
        />
      </svg>
    </div>
  )
}

/* ------------------------------ the sign-in card --------------------------- */

function LoginCard() {
  const { lang, setLang, t } = useLoginLang()
  const router = useRouter()
  const { status } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already authenticated: go straight to the workspace.
  useEffect(() => {
    if (status === "authenticated") router.replace("/app")
  }, [status, router])

  // Honour the remembered email (kept in localStorage — no server logic change).
  // Applied via microtask so state updates happen after the effect body
  // (post-hydration prefill, before paint).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("nemchem.login.rememberEmail")
      if (saved) {
        queueMicrotask(() => {
          setEmail(saved)
          setRemember(true)
        })
      }
    } catch {
      // ignore
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading || !email || !password) return
    setError(null)
    setLoading(true)
    try {
      const res = await signIn("credentials", { email, password, redirect: false })
      if (res?.error) {
        setError(t("login.invalid"))
        setLoading(false)
        return
      }
      try {
        if (remember) window.localStorage.setItem("nemchem.login.rememberEmail", email)
        else window.localStorage.removeItem("nemchem.login.rememberEmail")
      } catch {
        // ignore
      }
      router.push("/app")
      router.refresh()
    } catch {
      setError(t("login.invalid"))
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full max-w-[430px] rounded-[28px] bg-white px-6 py-8 shadow-[0_24px_70px_rgba(13,47,110,0.18)] sm:px-9 sm:py-10">
      {/* language selector lives in the card on desktop; on mobile it is in the page header */}
      <div className="absolute right-5 top-5 hidden lg:block sm:right-6">
        <LanguageMenu lang={lang} setLang={setLang} label={t("login.language")} />
      </div>

      <Image
        src="/nemchem-logo.webp"
        alt="NemChem Moçambique"
        width={180}
        height={120}
        priority
        className="mx-auto hidden h-auto w-40 sm:w-44 lg:block"
      />

      <h2 className="mt-6 text-center text-xl font-bold leading-snug text-[#0b2a6b] sm:text-2xl">
        {t("login.welcome")}
      </h2>
      <p className="mt-2 text-center text-sm text-slate-500 sm:text-base">{t("login.description")}</p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="relative">
          <label htmlFor="login-email" className="sr-only">
            {t("login.emailLabel")}
          </label>
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("login.emailPlaceholder")}
            className="h-12 w-full rounded-full border border-slate-300 bg-white pl-11 pr-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:h-[52px]"
          />
        </div>

        <div className="relative">
          <label htmlFor="login-password" className="sr-only">
            {t("login.passwordLabel")}
          </label>
          <Lock
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.passwordPlaceholder")}
            className="h-12 w-full rounded-full border border-slate-300 bg-white pl-11 pr-12 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:h-[52px]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
            className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            {showPassword ? (
              <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-[18px] w-[18px] rounded border-slate-300 accent-blue-600"
            />
            {t("login.remember")}
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          aria-busy={loading}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-blue-600 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70 sm:h-[52px]"
        >
          {loading ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
              {t("login.submitting")}
            </>
          ) : (
            <>
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
              {t("login.submit")}
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-xs text-slate-400">{t("login.footer")}</p>
    </div>
  )
}

/* ------------------------------- the screen -------------------------------- */

export function LoginScreen() {
  const { lang, setLang, t } = useLoginLang()

  // Keep <html lang> in sync (a11y/SEO), mirroring the landing behaviour.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const leftPanel = useMemo(
    () => (
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#2a62cc] via-[#1047a8] to-[#0a2f7a] lg:flex lg:flex-col lg:justify-between">
        {/* hygiene photo, blue-washed, on the right side like the reference */}
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover object-right opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1047a8] via-[#1047a8]/70 to-[#1c63d6]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a2f7a]/75 via-transparent to-transparent" />
        <Waves />

        <div className="relative z-10 flex items-start justify-between p-10 xl:p-14">
          <Image
            src="/nemchem-logo.webp"
            alt="NemChem Moçambique"
            width={220}
            height={147}
            priority
            className="h-auto w-56 xl:w-64"
          />
        </div>

        <div className="relative z-10 px-10 pb-6 xl:px-14">
          <h1 className="max-w-xl text-[clamp(2rem,3.2vw,3.2rem)] font-bold leading-[1.15] text-white">
            {t("login.title")}
          </h1>
          <div className="mt-6 h-1.5 w-24 rounded-full bg-cyan-400" />
          <p className="mt-6 max-w-md text-lg leading-relaxed text-blue-100">
            {t("login.subtitle")}
          </p>
        </div>

        <div className="relative z-10 px-10 pb-14 xl:px-14">
          <Benefits />
        </div>
      </div>
    ),
    [t]
  )

  return (
    <main className="min-h-dvh bg-[#e9eff6]">
      {/* desktop — split layout like the reference */}
      <div className="hidden lg:grid lg:min-h-dvh lg:grid-cols-[1.15fr_1fr]">
        {leftPanel}
        <div className="flex items-center justify-center p-8">
          <LoginCard />
        </div>
      </div>

      {/* mobile — own compact arrangement, same identity */}
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-[#1d55c0] via-[#1250b4] to-[#1c63d6] lg:hidden">
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2f7a]/85 via-[#1250b4]/80 to-[#1c63d6]/85" />

        <header
          className="relative z-10 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]"
        >
          <Image
            src="/nemchem-logo.webp"
            alt="NemChem Moçambique"
            width={160}
            height={107}
            priority
            className="h-auto w-32"
          />
          <LanguageMenu lang={lang} setLang={setLang} onDark label={t("login.language")} />
        </header>

        <div className="relative z-10 px-5 pt-6">
          <h1 className="text-2xl font-bold leading-snug text-white">{t("login.title")}</h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-cyan-400" />
          <p className="mt-3 text-sm leading-relaxed text-blue-100">{t("login.subtitle")}</p>
        </div>

        <div className="relative z-10 px-5 pt-5">
          <Benefits compact />
        </div>

        <div
          className="relative z-10 flex flex-1 items-start justify-center px-4 pb-6 pt-6"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        >
          <LoginCard />
        </div>
      </div>
    </main>
  )
}
