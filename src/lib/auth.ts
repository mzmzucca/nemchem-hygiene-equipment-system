import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/password"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })
        if (!user || !user.active) return null

        // Support both hashed and legacy plain-text passwords (seed uses plain for demo)
        const valid = verifyPassword(credentials.password, user.password) ||
          user.password === credentials.password
        if (!valid) return null

        // Return as a plain record — NextAuth v4's internal User type
        // conflicts with an `id` getter, so we cast to any.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } as Record<string, unknown>
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Serialize to strip any internal getters — NextAuth v4's User
        // type defines `id` as a getter which conflicts with direct access.
        const u = JSON.parse(JSON.stringify(user)) as {
          id: string
          role: string
        }
        ;(token as any).userId = u.id
        ;(token as any).userRole = u.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token as any).userId
        ;(session.user as any).role = (token as any).userRole
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "nemchem-dev-secret-change-in-production",
}

export type AppRole = "ADMIN" | "CEO" | "SUPERVISOR" | "INSPECTOR"
