"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  BookOpen,
  Calendar,
  MessageSquare,
  FileSignature,
  Settings,
  Shield,
  LogOut,
  Scale,
  UserCog,
  Clock,
  Receipt,
  FileCheck,
  SearchCheck,
  Stamp,
  Gavel,
  Building2,
  FileCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasPermission, type Role, type Permission } from "@/lib/permissions";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/clients", label: "Clients", icon: Users, permission: "clients:read" as Permission },
  { href: "/cases", label: "Cases", icon: Briefcase, permission: "cases:read" as Permission },
  { href: "/ecourts", label: "eCourts/DCMS", icon: Scale, permission: "cases:read" as Permission },
  { href: "/submissions", label: "Doc Submissions", icon: FileCheck, permission: "cases:read" as Permission },
  { href: "/case-filing", label: "Case Filing", icon: Stamp, permission: "cases:read" as Permission },
  { href: "/interlocutory", label: "IA Petitions", icon: Scale, permission: "cases:read" as Permission },
  { href: "/execution", label: "Execution & EP", icon: Gavel, permission: "cases:read" as Permission },
  { href: "/documents", label: "Documents", icon: FileText, permission: "documents:read" as Permission },
  { href: "/scrutiny", label: "Scrutiny Reports", icon: SearchCheck, permission: "scrutiny:read" as Permission },
  { href: "/diary", label: "Court Diary", icon: BookOpen, permission: "diary:read" as Permission },
  { href: "/schedule", label: "Schedule", icon: Calendar, permission: "schedule:read" as Permission },
  { href: "/limitation", label: "Limitation Tracker", icon: Clock, permission: "limitation:read" as Permission },
  { href: "/notices", label: "Notices", icon: FileSignature, permission: "notices:read" as Permission },
  { href: "/format-library", label: "Format Library", icon: FileText, permission: "notices:read" as Permission },
  { href: "/billing", label: "Billing", icon: Receipt, permission: "billing:read" as Permission },
  { href: "/bank-opinion", label: "Bank Opinion", icon: Building2, permission: "cases:read" as Permission },
  { href: "/defence", label: "AI Defence", icon: Shield, permission: "chat:use" as Permission },
  { href: "/chat", label: "AI Chat", icon: MessageSquare, permission: "chat:use" as Permission },
  { href: "/templates", label: "Templates", icon: FileCog, permission: "settings:read" as Permission },
  { href: "/users", label: "Users", icon: UserCog, permission: "users:read" as Permission },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:read" as Permission },
  { href: "/audit", label: "Audit Log", icon: Shield, permission: "audit:read" as Permission },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user?.role || "INTERN") as Role;

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Scale className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Legal RAG</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium truncate">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground">{role.replace(/_/g, " ")}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
