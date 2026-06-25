import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity } from "lucide-react";

type CronRun = {
  id: number;
  jobName: string;
  status: "success" | "error" | "partial";
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  itemsProcessed: number | null;
  itemsSucceeded: number | null;
  itemsFailed: number | null;
  errorMessage: string | null;
  triggeredBy: string | null;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "success")
    return (
      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" /> Success
      </Badge>
    );
  if (status === "partial")
    return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" /> Partial
      </Badge>
    );
  return (
    <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
      <XCircle className="w-3 h-3 mr-1" /> Error
    </Badge>
  );
}

function fmtTime(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? s : d.toLocaleString("en-US", { timeZone: "America/Denver" });
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function JobHealth() {
  const { data, isLoading, refetch, isFetching } = trpc.cronHealth.recentRuns.useQuery({ limit: 200 });
  const runs = (data as CronRun[] | undefined) ?? [];
  const failures = runs.filter((r) => r.status === "error");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="w-7 h-7" /> Job Health
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Recent scheduled-job runs. Failures also notify admins automatically.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {failures.length > 0 && (
          <Card className="border-red-500/40 bg-red-50 dark:bg-red-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-700 dark:text-red-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> {failures.length} failed run{failures.length === 1 ? "" : "s"} recently
              </CardTitle>
              <CardDescription>
                Most recent: <strong>{failures[0].jobName}</strong> — {failures[0].errorMessage || "see logs"}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent runs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : runs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No runs recorded yet. (Jobs don't run in staging — they log once this is on a live deploy.)
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Items (ok / fail)</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.jobName}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtTime(r.startedAt)}</TableCell>
                      <TableCell className="text-sm">{fmtDuration(r.durationMs)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {r.itemsSucceeded ?? 0}
                        {(r.itemsFailed ?? 0) > 0 && (
                          <span className="text-red-600"> / {r.itemsFailed}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.triggeredBy || "cron"}</TableCell>
                      <TableCell className="text-sm text-red-600 max-w-xs truncate" title={r.errorMessage || ""}>
                        {r.errorMessage || ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
