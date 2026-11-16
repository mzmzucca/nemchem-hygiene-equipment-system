"use client"

import { useMemo, useState } from "react"
import {
  Mail, RefreshCw, Plus, Send, Inbox,
  CircleDashed, CheckCircle2, User as UserIcon, Loader2,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDateTime,
} from "@/components/shared"
import { useApi, useCreate, apiPut } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import type { Message, User } from "@/lib/types"
import { cn } from "@/lib/utils"

export function MessagesModule() {
  const { can } = usePermissions()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)

  const { data: messages, isLoading, refetch, isFetching } = useApi<Message[]>(
    ["messages"],
    "/api/messages",
  )
  const { data: users } = useApi<User[]>(["users", "list"], "/api/users", can("users:view"))

  const sorted = useMemo(() => {
    return [...(messages ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [messages])

  const selected = sorted.find((m) => m.id === selectedId) ?? null
  const unread = sorted.filter((m) => !m.read && m.recipient).length

  const createMut = useCreate<Message>("/api/messages", [["messages"]])

  const markRead = async (id: string) => {
    try {
      // Update message by sending PUT to /api/messages with id+read (server-side endpoint supports it)
      await apiPut("/api/messages", { id, read: true })
      qc.invalidateQueries({ queryKey: ["messages"] })
      toast.success("Marked as read")
    } catch {
      toast.error("Failed to mark as read")
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Messages"
        description="Direct, role-based messaging between team members"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {can("messages:send") && (
              <Button size="sm" onClick={() => setComposeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Compose
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Inbox" value={sorted.length} icon={Inbox} accent="teal" />
        <KpiCard title="Unread" value={unread} icon={CircleDashed} accent={unread > 0 ? "rose" : "emerald"} />
        <KpiCard title="Sent by you" value={sorted.filter((m) => m.sender).length} icon={Send} accent="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Inbox list */}
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <div className="p-3 border-b">
              <p className="text-sm font-semibold">Inbox</p>
            </div>
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : sorted.length === 0 ? (
              <EmptyState title="No messages" description="Start a conversation by composing a new message." icon={Mail} />
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y">
                {sorted.map((m) => {
                  const isActive = m.id === selectedId
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={cn(
                        "w-full text-left p-3 transition-colors hover:bg-muted/40",
                        isActive && "bg-muted/60 border-l-2 border-teal-500",
                        !m.read && m.recipient && "bg-teal-50/40 dark:bg-teal-900/10",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                            {(m.sender?.name ?? "U").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-xs font-medium truncate", !m.read && m.recipient && "font-semibold")}>
                              {m.sender?.name ?? "Unknown"}
                            </p>
                            {!m.read && m.recipient && (
                              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                          </div>
                          <p className={cn("text-xs truncate mt-0.5", !m.read && m.recipient ? "text-foreground font-medium" : "text-muted-foreground")}>
                            {m.subject}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDateTime(m.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {!selected ? (
              <div className="h-full min-h-[40vh] flex items-center justify-center">
                <EmptyState
                  title="Select a message"
                  description="Pick a conversation from the inbox to view its contents."
                  icon={Mail}
                />
              </div>
            ) : (
              <MessageDetail message={selected} onMarkRead={() => markRead(selected.id)} />
            )}
          </CardContent>
        </Card>
      </div>

      {composeOpen && (
        <ComposeDialog
          users={users ?? []}
          onClose={() => setComposeOpen(false)}
          onSend={(payload) => {
            createMut.mutate(payload as any, {
              onSuccess: () => setComposeOpen(false),
            })
          }}
          sending={createMut.isPending}
        />
      )}
    </div>
  )
}

function MessageDetail({ message: m, onMarkRead }: { message: Message; onMarkRead: () => void }) {
  return (
    <div className="flex flex-col h-full max-h-[60vh]">
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{m.subject}</p>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  {(m.sender?.name ?? "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{m.sender?.name ?? "Unknown"}</span>
              {m.sender?.role && <StatusBadge status={m.sender.role} />}
            </div>
          </div>
          {!m.read && m.recipient && (
            <Button size="sm" variant="outline" onClick={onMarkRead}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Mark Read
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{fmtDateTime(m.createdAt)}</p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
      </div>
      <div className="p-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserIcon className="h-3 w-3" />
          To: {m.recipient?.name ?? "—"}
        </div>
        {m.read ? (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Read
          </span>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CircleDashed className="h-3 w-3" />
            Unread
          </span>
        )}
      </div>
    </div>
  )
}

function ComposeDialog({
  users, onClose, onSend, sending,
}: {
  users: User[]
  onClose: () => void
  onSend: (payload: { toUserId: string; subject: string; body: string }) => void
  sending: boolean
}) {
  const [toUserId, setToUserId] = useState<string>("")
  const [subject, setSubject] = useState<string>("")
  const [body, setBody] = useState<string>("")

  const canSend = toUserId && subject.trim() && body.trim()

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Message
          </DialogTitle>
          <DialogDescription>Send a direct message to a team member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Recipient</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select recipient…" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} — {u.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject line"
              className="mt-1"
              maxLength={120}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              className="mt-1 min-h-[140px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!canSend || sending}
            onClick={() => onSend({ toUserId, subject: subject.trim(), body: body.trim() })}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
