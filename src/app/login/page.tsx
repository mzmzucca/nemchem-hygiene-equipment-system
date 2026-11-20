import type { Metadata, Viewport } from "next"
import { LoginScreen } from "@/components/login/login-screen"

export const metadata: Metadata = {
  title: "Entrar | NemChem — Sistema de Gestão de Equipamentos de Higiene",
  description:
    "Acesse sua conta para controlar, monitorar e garantir a higienização dos equipamentos.",
}

export const viewport: Viewport = {
  themeColor: "#0a2f7a",
}

export default function LoginPage() {
  return <LoginScreen />
}
