import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, FileText, Calendar, BookOpen, FileSignature } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { EcourtsSyncButton } from "@/components/ecourts-sync-button";

export default async function DashboardPage() {
  const [clientCount, caseCount, documentCount, upcomingHearings, recentDiary, pendingNotices] =
    await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.case.count({ where: { status: { not: "CLOSED" } } }),
      prisma.document.count(),
      prisma.case.findMany({
        where: {
          nextHearingDate: { gte: new Date() },
          status: "ACTIVE",
        },
        orderBy: { nextHearingDate: "asc" },
        take: 5,
        include: { caseClients: { include: { client: true } } },
      }),
      prisma.diaryEntry.findMany({
        orderBy: { date: "desc" },
        take: 5,
        include: { case: true },
      }),
      prisma.notice.count({ where: { status: "PENDING_APPROVAL" } }),
    ]);

  const stats = [
    { label: "Active Clients", value: clientCount, icon: Users, href: "/clients", color: "bg-blue-500" },
    { label: "Open Cases", value: caseCount, icon: Briefcase, href: "/cases", color: "bg-emerald-500" },
    { label: "Documents", value: documentCount, icon: FileText, href: "/documents", color: "bg-amber-500" },
    { label: "Pending Notices", value: pendingNotices, icon: FileSignature, href: "/notices", color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <EcourtsSyncButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow overflow-hidden p-0">
                <CardHeader className={`flex flex-row items-center justify-between pb-2 px-6 pt-4 ${stat.color} text-white`}>
                  <CardTitle className="text-sm font-medium text-white">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-white" />
                </CardHeader>
                <CardContent className="px-6 py-4">
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <CardHeader className="bg-rose-500 text-white px-6 pt-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5" />
              Upcoming Hearings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-4">
            {upcomingHearings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming hearings</p>
            ) : (
              <div className="space-y-3">
                {upcomingHearings.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{c.caseNumber}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {c.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {c.nextHearingDate ? format(new Date(c.nextHearingDate), "dd MMM yyyy") : "N/A"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{c.courtName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden p-0">
          <CardHeader className="bg-teal-500 text-white px-6 pt-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <BookOpen className="h-5 w-5" />
              Recent Diary Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-4">
            {recentDiary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No diary entries</p>
            ) : (
              <div className="space-y-3">
                {recentDiary.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div>
                      <p className="font-medium text-sm">{entry.caseNumber}</p>
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{format(new Date(entry.date), "dd MMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{entry.stage}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
