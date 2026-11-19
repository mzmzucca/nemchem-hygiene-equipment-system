"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import { landingDictionaries, type LandingKey, type LandingLang } from "@/lib/i18n/landing-dictionaries"

/**
 * Lightweight i18n context for the public landing page.
 *
 * Resolution order: ?lang= URL parameter → localStorage → "pt" (default).
 * The choice is persisted so it survives navigation between public
 * sections and reloads. document.documentElement.lang is kept in sync
 * for accessibility and SEO.
 *
 * Implemented with useSyncExternalStore so that hydration always matches
 * the server render (Portuguese) and the stored preference is applied
 * right after hydration without setState-in-effect.
 */

const STORAGE_KEY = "nemchem.landing.lang"

function readPreferredLang(): LandingLang {
  if (typeof window === "undefined") return "pt"
  try {
    const param = new URLSearchParams(window.location.search).get("lang")
    if (param === "en" || param === "pt") return param
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "en" || stored === "pt") return stored
  } catch {
    // storage unavailable — fall through to default
  }
  return "pt"
}

const listeners = new Set<() => void>()
let clientLang: LandingLang | null = null

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

function getSnapshot(): LandingLang {
  if (clientLang === null) clientLang = readPreferredLang()
  return clientLang
}

function getServerSnapshot(): LandingLang {
  return "pt"
}

function persistLang(next: LandingLang) {
  clientLang = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // ignore
  }
  listeners.forEach((notify) => notify())
}

interface LandingI18nValue {
  lang: LandingLang
  setLang: (lang: LandingLang) => void
  t: (key: LandingKey) => string
}

const LandingI18nContext = createContext<LandingI18nValue | null>(null)

export function LandingI18nProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setLang = useCallback((next: LandingLang) => persistLang(next), [])

  // Keep <html lang> in sync with the landing language for a11y/SEO.
  // DOM write only — safe inside an effect (no setState).
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (key: LandingKey) => {
      const dict = landingDictionaries[lang] as Record<string, string>
      const fallback = landingDictionaries.pt as Record<string, string>
      return dict[key] ?? fallback[key] ?? key
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LandingI18nContext.Provider value={value}>{children}</LandingI18nContext.Provider>
}

export function useLandingI18n(): LandingI18nValue {
  const ctx = useContext(LandingI18nContext)
  if (!ctx) throw new Error("useLandingI18n must be used within LandingI18nProvider")
  return ctx
}
