import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  Phone,
  User,
  Clock,
  Shield,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";

export default function DataQuality() {
  const [, navigate] = useLocation();

  const { data, isLoading } = trpc.client360.dataQuality.useQuery();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  const stats = data || {
    totalContacts: 0,
    completeRecords: 0,
    missingEmail: [],
    missingPhone: [],
    missingBoth: [],
    staleContacts: [],
    unlinkedProspects: 0,
    unlinkedProtocols: 0,
    unlinkedUsers: 0,
  };

  const completionRate = stats.totalContacts > 0
    ? Math.round((stats.completeRecords / stats.totalContacts) * 100)
    : 0;

  const issueCount = stats.missingEmail.length + stats.missingPhone.length + stats.missingBoth.length + stats.staleContacts.length;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Quality Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor contact data completeness and identify records that need attention.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">Total Contacts</span>
              </div>
              <div className="text-3xl font-bold">{stats.totalContacts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Complete Records</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{stats.completeRecords}</div>
              <div className="text-xs text-muted-foreground mt-1">{completionRate}% completion rate</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-muted-foreground">Issues Found</span>
              </div>
              <div className="text-3xl font-bold text-orange-600">{issueCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Records needing attention</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Health Score</span>
              </div>
              <div className={`text-3xl font-bold ${completionRate >= 80 ? 'text-green-600' : completionRate >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                {completionRate >= 80 ? 'Good' : completionRate >= 60 ? 'Fair' : 'Needs Work'}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${completionRate >= 80 ? 'bg-green-500' : completionRate >= 60 ? 'bg-orange-500' : 'bg-red-500'}`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completion Bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Data Completeness Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Complete (email + phone)
                </span>
                <span className="font-medium">{stats.completeRecords}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  Missing email only
                </span>
                <span className="font-medium">{stats.missingEmail.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  Missing phone only
                </span>
                <span className="font-medium">{stats.missingPhone.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Missing both
                </span>
                <span className="font-medium">{stats.missingBoth.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issue Lists */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Missing Email */}
          {stats.missingEmail.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                  <Mail className="h-4 w-4" /> Missing Email ({stats.missingEmail.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.missingEmail.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div>
                        <div className="text-sm font-medium">{c.fullName || c.firstName + ' ' + c.lastName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.phone || '—'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/admin/contact-admin")}
                      >
                        Fix <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Missing Phone */}
          {stats.missingPhone.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                  <Phone className="h-4 w-4" /> Missing Phone ({stats.missingPhone.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.missingPhone.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div>
                        <div className="text-sm font-medium">{c.fullName || c.firstName + ' ' + c.lastName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {c.email || '—'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/admin/contact-admin")}
                      >
                        Fix <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Missing Both */}
          {stats.missingBoth.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" /> Missing Email & Phone ({stats.missingBoth.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.missingBoth.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div>
                        <div className="text-sm font-medium">{c.fullName || c.firstName + ' ' + c.lastName}</div>
                        <div className="text-xs text-muted-foreground">No contact info</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/admin/contact-admin")}
                      >
                        Fix <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stale Contacts */}
          {stats.staleContacts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4" /> Stale Records ({stats.staleContacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Contacts with no activity in the last 90 days</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.staleContacts.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div>
                        <div className="text-sm font-medium">{c.fullName || c.firstName + ' ' + c.lastName}</div>
                        <div className="text-xs text-muted-foreground">
                          Last updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{c.lifecycleStage?.replace(/_/g, " ") || "unknown"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Unlinked Records */}
        {(stats.unlinkedProspects > 0 || stats.unlinkedProtocols > 0 || stats.unlinkedUsers > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-purple-600">
                <Shield className="h-4 w-4" /> Unlinked Records (Legacy)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Records created before the unified contacts system. These still work but aren't linked to a canonical contact yet.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{stats.unlinkedProspects}</div>
                  <div className="text-xs text-muted-foreground">Unlinked Prospects</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{stats.unlinkedProtocols}</div>
                  <div className="text-xs text-muted-foreground">Unlinked Protocols</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{stats.unlinkedUsers}</div>
                  <div className="text-xs text-muted-foreground">Unlinked Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Clear */}
        {issueCount === 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-700">All Clear!</h3>
              <p className="text-sm text-green-600 mt-1">All contact records have complete email and phone information.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
