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
    { label: "Active Clients", value: clientCount, icon: Users, href: "/clients" },
    { label: "Open Cases", value: caseCount, icon: Briefcase, href: "/cases" },
    { label: "Documents", value: documentCount, icon: FileText, href: "/documents" },
    { label: "Pending Notices", value: pendingNotices, icon: FileSignature, href: "/notices" },
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
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Hearings
            </CardTitle>
          </CardHeader>
          <CardContent>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recent Diary Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
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
