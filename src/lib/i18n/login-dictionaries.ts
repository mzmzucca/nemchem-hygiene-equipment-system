/**
 * Login page translations — Portuguese (default) and English.
 *
 * Mirrors the landing i18n approach (flat dotted keys) and REUSES the same
 * localStorage key ("nemchem.landing.lang"), so the language chosen on the
 * landing page is honoured here and vice-versa.
 */

export const loginDictionaries = {
  pt: {
    "login.docTitle": "Entrar | NemChem",
    "login.title": "Sistema de Gestão de Equipamentos de Higiene",
    "login.subtitle": "Controle, monitore e garanta a higienização dos seus equipamentos com eficiência.",
    "login.benefit1": "Mais Segurança",
    "login.benefit2": "Maior Controle",
    "login.benefit3": "Conformidade Garantida",
    "login.welcome": "Bem-vindo ao Sistema de Higienização de Equipamentos",
    "login.description": "Acesse sua conta para continuar",
    "login.emailLabel": "Email",
    "login.emailPlaceholder": "Email",
    "login.passwordLabel": "Senha",
    "login.passwordPlaceholder": "Senha",
    "login.remember": "Lembrar-me",
    "login.submit": "Entrar",
    "login.submitting": "A entrar…",
    "login.invalid": "Credenciais inválidas — verifique o email e a senha.",
    "login.showPassword": "Mostrar senha",
    "login.hidePassword": "Ocultar senha",
    "login.language": "Idioma",
    "login.footer": "© 2026 NemChem. Todos os direitos reservados.",
  },
  en: {
    "login.docTitle": "Sign in | NemChem",
    "login.title": "Hygiene Equipment Management System",
    "login.subtitle": "Control, monitor and guarantee the sanitisation of your equipment with efficiency.",
    "login.benefit1": "More Safety",
    "login.benefit2": "Greater Control",
    "login.benefit3": "Guaranteed Compliance",
    "login.welcome": "Welcome to the Equipment Sanitisation System",
    "login.description": "Access your account to continue",
    "login.emailLabel": "Email",
    "login.emailPlaceholder": "Email",
    "login.passwordLabel": "Password",
    "login.passwordPlaceholder": "Password",
    "login.remember": "Remember me",
    "login.submit": "Sign in",
    "login.submitting": "Signing in…",
    "login.invalid": "Invalid credentials — please check your email and password.",
    "login.showPassword": "Show password",
    "login.hidePassword": "Hide password",
    "login.language": "Language",
    "login.footer": "© 2026 NemChem. All rights reserved.",
  },
} as const

export type LoginLang = keyof typeof loginDictionaries
export type LoginKey = keyof typeof loginDictionaries.pt

export const LOGIN_LANG_STORAGE_KEY = "nemchem.landing.lang"
