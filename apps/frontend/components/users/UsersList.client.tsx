// path: apps/frontend/components/users/UsersList.client.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Users as UsersIcon, Mail, Phone } from "lucide-react"

import type { User } from "@/lib/types/users"
import { getRoleLabel } from "@/lib/utils/role-labels"

import { Badge } from "@/components/ui/badge"

function getFullName(u: User) {
  const first = (u.firstName || "").trim()
  const last = (u.lastName || "").trim()
  const full = [first, last].filter(Boolean).join(" ")
  return full || u.email || "Без имени"
}

function getInitials(u: User) {
  const first = (u.firstName || "").trim()[0] || ""
  const last = (u.lastName || "").trim()[0] || ""
  return (first + last).toUpperCase() || "?"
}

function mapUserStatusToVariant(status?: string): { label: string; variant: "active" | "draft" } {
  const s = (status || "active").toLowerCase()
  if (s === "active") return { label: "Активен", variant: "active" }
  return { label: "Неактивен", variant: "draft" }
}

export default function UsersList({ users }: { users: User[] }) {
  return (
    <div className="divide-y divide-border/50">
      {users.map((u) => (
        <UserRow key={u.id} user={u} />
      ))}
    </div>
  )
}

function UserRow({ user }: { user: User }) {
  const fullName = getFullName(user)
  const initials = getInitials(user)

  const roleSlug = user.role?.name || "viewer"
  const roleLabel = getRoleLabel(roleSlug)

  const statusInfo = mapUserStatusToVariant(user.status)

  const metaParts: React.ReactNode[] = []
  if (user.email) {
    metaParts.push(
      <span key="email" className="inline-flex items-center gap-xs">
        <Mail className="w-3.5 h-3.5" />
        <span className="truncate">{user.email}</span>
      </span>
    )
  }
  if (user.phone) {
    metaParts.push(
      <span key="phone" className="inline-flex items-center gap-xs">
        <Phone className="w-3.5 h-3.5" />
        <span className="truncate">{user.phone}</span>
      </span>
    )
  }

  return (
    <Link href={`/dashboard/users/${user.id}`} className="block transition-colors hover:bg-surface-2">
      <div className="p-md flex items-center justify-between gap-lg min-w-0">
        <div className="flex items-center gap-md min-w-0 flex-1">
          <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-muted-foreground">{initials}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-sm min-w-0">
              <span className="text-sm font-medium truncate">{fullName}</span>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>

            <div className="text-xs text-muted-foreground truncate mt-xs">
              {metaParts.length > 0 ? (
                <span className="inline-flex items-center gap-sm min-w-0">
                  {metaParts.reduce((acc: React.ReactNode[], node, idx) => {
                    if (idx > 0) acc.push(<span key={`sep-${idx}`}>·</span>)
                    acc.push(node)
                    return acc
                  }, [])}
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-sm shrink-0">
          <Badge variant="secondary">{roleLabel}</Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </Link>
  )
}
