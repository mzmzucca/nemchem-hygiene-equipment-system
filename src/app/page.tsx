"use client"

import { useEffect } from "react"
import { LandingI18nProvider, useLandingI18n } from "@/components/landing/landing-i18n"
import { LandingHeader } from "@/components/landing/landing-header"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingAbout, LandingFeatures, LandingHowItWorks } from "@/components/landing/landing-sections"
import { LandingClients } from "@/components/landing/landing-clients"
import { LandingContact } from "@/components/landing/landing-contact"
import { LandingFooter } from "@/components/landing/landing-footer"
import { landingDictionaries } from "@/lib/i18n/landing-dictionaries"

/**
 * Public landing page (route "/").
 *
 * Public by design — no authentication required. The authenticated
 * workspace lives at /app (protected by SignInGate + NextAuth), and all
 * existing API guards/roles are untouched.
 *
 * Portuguese (Mozambique) is the default language; English is available
 * from the header selector. The document title and description update
 * with the selected language.
 */
function LandingContent() {
  const { lang, t } = useLandingI18n()

  useEffect(() => {
    const applyMeta = () => {
      document.title = t("meta.title")
      const desc = document.querySelector('meta[name="description"]')
      if (desc) desc.setAttribute("content", t("meta.description"))
    }
    applyMeta()
    // Next.js re-applies the route's static metadata shortly after hydration,
    // which would overwrite the language-specific title. Re-assert it a few
    // times until that pass has settled.
    const timers = [100, 400, 1200].map((ms) => setTimeout(applyMeta, ms))
    return () => {
      timers.forEach((id) => clearTimeout(id))
      document.title = landingDictionaries.pt["meta.title"]
    }
  }, [lang, t])

  return (
    <div className="bg-white text-slate-900 antialiased">
      <a
        href="#sobre"
        className="absolute left-4 top-[-3.5rem] z-[60] rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-[top] focus:top-3"
      >
        {t("a11y.skip")}
      </a>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingAbout />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingClients />
        <LandingContact />
      </main>
      <LandingFooter />
    </div>
  )
}

export default function LandingPage() {
  return (
    <LandingI18nProvider>
      <LandingContent />
    </LandingI18nProvider>
  )
}
