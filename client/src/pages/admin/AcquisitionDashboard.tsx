/**
 * Client Acquisition & Retention — single-screen dashboard for Shannon.
 *
 * Design goal (per Jason): "fully functional but not overcomplicated."
 * Action-first, not chart-first. It answers one question — "what do I do next?"
 * — and updates itself from real pipeline data, so there is no board to maintain.
 *
 * Data comes from `prospect.getShannonDashboard`, which reuses the exact same
 * `gatherPipelineData()` that powers the daily 8 AM email, so the screen and the
 * inbox never disagree.
 *
 * The "Clients to keep an eye on" (retention) list is a placeholder until Jason
 * confirms the at-risk signal (quiet after N days / payment due / program ending).
 */
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  UserPlus,
  Flame,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  HeartPulse,
  RefreshCw,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  clicked: "Clicked",
  viewing: "Viewing",
  engaged: "Engaged",
  waiting_on_client: "Waiting",
  ready_for_consult: "Ready for Consult",
  not_ready: "Not Ready",
  stalled: "Stalled",
};

function statusLabel(s: string): string {
  return STATUS_LABELS[s] || s;
}

// Overdue duration → friendly text
function overdueText(hoursOverdue: number): string {
  if (hoursOverdue <= 0) return "Due today";
  if (hoursOverdue < 24) return `${hoursOverdue}h overdue`;
  const days = Math.floor(hoursOverdue / 24);
  return `${days}d overdue`;
}

export default function AcquisitionDashboard() {
  const [, navigate] = useLocation();
  const { data, isLoading, isError, refetch, isRefetching } =
    trpc.prospect.getShannonDashboard.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  const stats = data?.stats;
  const enrolledThisWeek = data?.recentConversions?.length ?? 0;
  const needsActionToday = (stats?.overdueFollowUps ?? 0) + (stats?.todayFollowUps ?? 0);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HeartPulse className="h-6 w-6 text-blue-700" />
              Client Acquisition &amp; Retention
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your day at a glance — who to reach out to, and who needs attention.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Error state */}
        {isError && (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="font-medium">Couldn&apos;t load the dashboard.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {/* Headline numbers — four only */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={UserPlus}
                iconClass="text-blue-700"
                label="New leads this week"
                value={stats?.weeklyNewProspects ?? 0}
              />
              <StatCard
                icon={Flame}
                iconClass="text-orange-600"
                label="Hot leads"
                value={stats?.hotLeadCount ?? 0}
              />
              <StatCard
                icon={CheckCircle2}
                iconClass="text-emerald-600"
                label="Enrolled (last 7 days)"
                value={enrolledThisWeek}
              />
              <StatCard
                icon={TrendingUp}
                iconClass="text-purple-600"
                label="Conversion rate"
                value={`${stats?.conversionRate ?? 0}%`}
              />
            </div>

            {/* Reach out today */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Reach out today
                  {needsActionToday > 0 && (
                    <Badge className="bg-amber-100 text-amber-800">{needsActionToday}</Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin/prospects")}
                >
                  Full pipeline <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data.followUpQueue?.length ?? 0) === 0 ? (
                  <EmptyRow text="Nobody's due for a follow-up today. Nice — you're caught up." />
                ) : (
                  data.followUpQueue.map((p, i) => (
                    <PersonRow
                      key={`fu-${i}`}
                      name={p.name}
                      phone={p.phone}
                      status={p.status}
                      thingsToKnow={p.thingsToKnow}
                      right={
                        <Badge
                          className={
                            p.hoursOverdue > 0
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }
                        >
                          {overdueText(p.hoursOverdue)}
                        </Badge>
                      }
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Hot leads */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-600" />
                  Hot leads — ready to enroll
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data.hotLeads?.length ?? 0) === 0 ? (
                  <EmptyRow text="No hot leads right now." />
                ) : (
                  data.hotLeads.map((p, i) => (
                    <PersonRow
                      key={`hot-${i}`}
                      name={p.name}
                      phone={p.phone}
                      status={p.status}
                      thingsToKnow={p.thingsToKnow}
                      right={<Badge variant="secondary">{statusLabel(p.status)}</Badge>}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Retention — clients to keep an eye on (placeholder pending Jason) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Clients to keep an eye on
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data.retentionReady ? (
                  <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
                    Coming soon — this will automatically flag active clients who&apos;ve
                    gone quiet, have a payment coming due, or are nearing the end of their
                    program. We&apos;re confirming the exact timing with Jason before turning
                    it on.
                  </div>
                ) : (data.retentionWatch?.length ?? 0) === 0 ? (
                  <EmptyRow text="No clients need attention right now." />
                ) : (
                  <div className="space-y-2">
                    {data.retentionWatch.map((c, i) => {
                      const isRenewal = c.reason.startsWith("Renewal");
                      const row = (
                        <div className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{c.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{c.detail}</p>
                          </div>
                          <Badge
                            className={
                              isRenewal
                                ? "bg-rose-100 text-rose-800 shrink-0"
                                : "bg-sky-100 text-sky-800 shrink-0"
                            }
                          >
                            {c.reason}
                          </Badge>
                        </div>
                      );
                      return c.protocolId ? (
                        <button
                          key={`ret-${i}`}
                          type="button"
                          className="w-full text-left"
                          onClick={() => navigate(`/admin/clients/${c.protocolId}`)}
                        >
                          {row}
                        </button>
                      ) : (
                        <div key={`ret-${i}`}>{row}</div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent wins */}
            {(data.recentConversions?.length ?? 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Recent wins (last 7 days)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.recentConversions.map((c, i) => (
                    <div
                      key={`win-${i}`}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {c.tier && (
                          <p className="text-sm text-muted-foreground">{c.tier}</p>
                        )}
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800">
                        {c.daysToConvert}d to enroll
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          {label}
        </div>
        <div className="text-3xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function PersonRow({
  name,
  phone,
  status,
  thingsToKnow,
  right,
}: {
  name: string;
  phone?: string | null;
  status: string;
  thingsToKnow?: string | null;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <p className="font-medium truncate">{name}</p>
        {thingsToKnow && (
          <p className="text-sm text-muted-foreground truncate">{thingsToKnow}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {right}
        {phone && (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${phone}`} aria-label={`Call ${name}`}>
              <Phone className="h-4 w-4 mr-1" />
              Call
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-2">{text}</p>;
}
