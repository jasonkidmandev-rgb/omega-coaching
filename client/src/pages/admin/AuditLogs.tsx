import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, History, Shield, UserPlus, UserMinus, Mail, Clock } from "lucide-react";
import { useState } from "react";
import { formatMT } from "@/lib/timezone";

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  
  const { data: logs, isLoading } = trpc.auditLog.list.useQuery({
    limit: 200,
    action: actionFilter === "all" ? undefined : actionFilter,
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "role_change":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Role Change</Badge>;
      case "admin_invitation_sent":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Invitation Sent</Badge>;
      case "admin_invitation_accepted":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Invitation Accepted</Badge>;
      case "admin_invitation_revoked":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Invitation Revoked</Badge>;
      case "user_created":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">User Created</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "role_change":
        return <Shield className="h-4 w-4 text-orange-500" />;
      case "admin_invitation_sent":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "admin_invitation_accepted":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "admin_invitation_revoked":
        return <UserMinus className="h-4 w-4 text-red-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground mt-1">
              Track all role changes and sensitive administrator actions
            </p>
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="role_change">Role Changes</SelectItem>
              <SelectItem value="admin_invitation_sent">Invitations Sent</SelectItem>
              <SelectItem value="admin_invitation_accepted">Invitations Accepted</SelectItem>
              <SelectItem value="admin_invitation_revoked">Invitations Revoked</SelectItem>
              <SelectItem value="user_created">User Created</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Activity History
            </CardTitle>
            <CardDescription>
              {logs?.length || 0} audit log entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!logs || logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No audit logs found</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const details = parseDetails(log.details);
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-gray-100"
                    >
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getActionBadge(log.action)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.createdAt ? formatMT(log.createdAt, "MMM d, yyyy 'at' h:mm a") : "Unknown"}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">User: {log.userEmail || `ID: ${log.userId}`}</span>
                          {log.targetUserId && (
                            <span className="text-muted-foreground"> → Target User ID: {log.targetUserId}</span>
                          )}
                        </div>
                        {details && (
                          <div className="text-xs text-muted-foreground mt-1 bg-white p-2 rounded border">
                            {details.oldRole && details.newRole && (
                              <p>Role changed from <strong>{details.oldRole}</strong> to <strong>{details.newRole}</strong></p>
                            )}
                            {details.email && (
                              <p>Email: {details.email}</p>
                            )}
                            {details.role && !details.oldRole && (
                              <p>Role: {details.role}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">About Audit Logs</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-2">
            <p>Audit logs track sensitive administrative actions for security and compliance purposes:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Role Changes:</strong> When a user's role is modified (e.g., promoted to admin)</li>
              <li><strong>Invitations Sent:</strong> When an admin sends a team invitation email</li>
              <li><strong>Invitations Accepted:</strong> When a new user accepts an invitation</li>
              <li><strong>Invitations Revoked:</strong> When an invitation is cancelled</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
