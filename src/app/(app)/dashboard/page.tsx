import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, FileText, Calendar, BookOpen, FileSignature, Clock, CalendarCheck, CalendarDays, CalendarClock } from "lucide-react";
import { format, isToday, isTomorrow, addDays, startOfDay } from "date-fns";
import Link from "next/link";
import { EcourtsSyncButton } from "@/components/ecourts-sync-button";

export default async function DashboardPage() {
  const [clientCount, caseCount, documentCount, upcomingHearings, recentDiary, pendingNotices, scheduleEvents] =
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
      prisma.scheduleEvent.findMany({
        where: {
          date: { gte: startOfDay(new Date()) },
        },
        orderBy: { date: "asc" },
        take: 30,
      }),
    ]);

  // Group schedule events into Kanban columns
  const today = new Date();
  const endOfThisWeek = addDays(startOfDay(today), 7);

  const todayEvents = scheduleEvents.filter((e) => isToday(new Date(e.date)));
  const tomorrowEvents = scheduleEvents.filter((e) => isTomorrow(new Date(e.date)));
  const thisWeekEvents = scheduleEvents.filter((e) => {
    const d = new Date(e.date);
    return !isToday(d) && !isTomorrow(d) && d <= endOfThisWeek;
  });
  const laterEvents = scheduleEvents.filter((e) => {
    const d = new Date(e.date);
    return d > endOfThisWeek;
  });

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

      {/* Schedule Events Kanban Board */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="bg-indigo-500 text-white px-6 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <CalendarDays className="h-5 w-5" />
              Schedule
            </CardTitle>
            <Link href="/schedule" className="text-xs text-white/80 hover:text-white transition-colors">
              View Calendar →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-4">
          {scheduleEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Today */}
              <KanbanColumn
                title="Today"
                icon={<CalendarCheck className="h-4 w-4" />}
                events={todayEvents}
                color="bg-red-50 border-red-200"
                badgeColor="bg-red-100 text-red-700"
                count={todayEvents.length}
              />
              {/* Tomorrow */}
              <KanbanColumn
                title="Tomorrow"
                icon={<Clock className="h-4 w-4" />}
                events={tomorrowEvents}
                color="bg-orange-50 border-orange-200"
                badgeColor="bg-orange-100 text-orange-700"
                count={tomorrowEvents.length}
              />
              {/* This Week */}
              <KanbanColumn
                title="This Week"
                icon={<CalendarDays className="h-4 w-4" />}
                events={thisWeekEvents}
                color="bg-blue-50 border-blue-200"
                badgeColor="bg-blue-100 text-blue-700"
                count={thisWeekEvents.length}
              />
              {/* Later */}
              <KanbanColumn
                title="Later"
                icon={<CalendarClock className="h-4 w-4" />}
                events={laterEvents}
                color="bg-gray-50 border-gray-200"
                badgeColor="bg-gray-100 text-gray-700"
                count={laterEvents.length}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  HEARING: "bg-blue-100 text-blue-700 border-blue-200",
  MEETING: "bg-green-100 text-green-700 border-green-200",
  DEADLINE: "bg-red-100 text-red-700 border-red-200",
  REMINDER: "bg-yellow-100 text-yellow-700 border-yellow-200",
  OTHER: "bg-gray-100 text-gray-700 border-gray-200",
};

function KanbanColumn({
  title,
  icon,
  events,
  color,
  badgeColor,
  count,
}: {
  title: string;
  icon: React.ReactNode;
  events: {
    id: string;
    title: string;
    date: Date;
    endDate: Date | null;
    eventType: string;
    description: string | null;
    caseId: string | null;
    isAllDay: boolean;
  }[];
  color: string;
  badgeColor: string;
  count: number;
}) {
  return (
    <div className={`rounded-lg border p-3 min-h-[200px] max-h-[400px] flex flex-col ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 font-semibold text-sm text-gray-900">
          {icon}
          {title}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
          {count}
        </span>
      </div>
      <div className="space-y-2 overflow-y-auto flex-1">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No events</p>
        ) : (
          events.map((event) => (
            <Link key={event.id} href="/schedule">
              <div className="bg-white rounded-md border border-gray-200 p-2.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.OTHER}`}
                  >
                    {event.eventType}
                  </Badge>
                  {event.isAllDay && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      All Day
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-900 truncate">{event.title}</p>
                {event.description && (
                  <p className="text-[11px] text-gray-600 mt-1 truncate">
                    {event.description}
                  </p>
                )}
                <p className="text-[10px] text-gray-500 mt-1">
                  {event.isAllDay
                    ? format(new Date(event.date), "dd MMM")
                    : format(new Date(event.date), "dd MMM, h:mm a")}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
