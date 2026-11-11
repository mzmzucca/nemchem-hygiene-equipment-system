import { NextResponse } from "next/server"

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function getId(req: Request) {
  const url = new URL(req.url)
  return url.pathname.split("/").pop()!
}
