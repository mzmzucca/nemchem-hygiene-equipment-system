"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export function useApi<T>(key: string | string[], url: string, enabled = true) {
  return useQuery<T>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Request failed")
      return res.json()
    },
    enabled,
  })
}

export function useCreate<T>(url: string, invalidateKeys: string[][]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<T>) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed")
      }
      return res.json()
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }))
      toast.success("Saved successfully")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdate<T>(url: string, invalidateKeys: string[][]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const res = await fetch(`${url}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed")
      }
      return res.json()
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }))
      toast.success("Updated successfully")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDelete(url: string, invalidateKeys: string[][]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${url}/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed")
      }
      return res.json()
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }))
      toast.success("Deleted successfully")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export async function apiPost(url: string, data: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error || "Failed")
  }
  return res.json()
}

export async function apiPut(url: string, data: unknown) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error || "Failed")
  }
  return res.json()
}
