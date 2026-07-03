import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT } from "@/lib/timezone";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  Link2Off,
  Copy,
  ArrowLeft,
  Wrench,
  Users,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function DataIntegrityAudit() {
  const [, navigate] = useLocation();

  const { data, isLoading, refetch, isFetching } = trpc.contacts.dataIntegrityAudit.useQuery(undefined, {
    staleTime: 0,
  });
  const fixMismatch = trpc.contacts.fixMismatch.useMutation({
    onSuccess: () => {
      toast.success("Contact data synced to all linked records.");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const fixAll = trpc.contacts.fixAllMismatches.useMutation({
    onSuccess: (result) => {
      toast.success(`Synced ${result.totalFixed} contacts to all linked records.`);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [activeTab, setActiveTab] = useState<"overview" | "mismatches" | "missing" | "orphaned" | "duplicates">("overview");

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-lg text-gray-600">Running data integrity scan...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Unable to load audit data.</p>
        </div>
      </AdminLayout>
    );
  }

  const { summary, tableCounts, mismatches, missingLinks, orphanedRecords, duplicateEmails, duplicatePhones } = data;

  const healthColor = summary.healthScore >= 95 ? "text-green-600" : summary.healthScore >= 80 ? "text-yellow-600" : "text-red-600";
  const healthBg = summary.healthScore >= 95 ? "bg-green-50 border-green-200" : summary.healthScore >= 80 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
  const healthIcon = summary.healthScore >= 95 ? <ShieldCheck className="w-12 h-12 text-green-500" /> : summary.healthScore >= 80 ? <AlertTriangle className="w-12 h-12 text-yellow-500" /> : <ShieldAlert className="w-12 h-12 text-red-500" />;

  const tabs = [
    { key: "overview" as const, label: "Overview", count: null },
    { key: "mismatches" as const, label: "Mismatches", count: summary.totalMismatches },
    { key: "missing" as const, label: "Missing Links", count: summary.totalUnlinked },
    { key: "orphaned" as const, label: "Orphaned", count: summary.totalOrphaned },
    { key: "duplicates" as const, label: "Duplicates", count: summary.totalDuplicateEmails + summary.totalDuplicatePhones },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-6 h-6" /> Data Integrity Audit
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Scanned at {toLocaleDateStringMT(data.auditTimestamp)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {summary.totalMismatches > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fixAll.mutate()}
                disabled={fixAll.isPending}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {fixAll.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wrench className="w-4 h-4 mr-1" />}
                Fix All Mismatches
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Re-scan
            </Button>
          </div>
        </div>

        {/* Health Score Card */}
        <Card className={`mb-6 border-2 ${healthBg}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {healthIcon}
                <div>
                  <div className={`text-4xl font-bold ${healthColor}`}>{summary.healthScore}%</div>
                  <div className="text-sm text-gray-600 mt-1">Data Health Score</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-600">Total Contacts:</span>
                  <span className="font-semibold">{summary.totalContacts}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-600">Total Records:</span>
                  <span className="font-semibold">{summary.totalRecords}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">Linked:</span>
                  <span className="font-semibold">{summary.totalLinkedRecords}</span>
                </div>
                <div className="flex items-center gap-2">
                  {summary.totalIssues === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-gray-600">Issues Found:</span>
                  <span className={`font-semibold ${summary.totalIssues > 0 ? "text-red-600" : "text-green-600"}`}>
                    {summary.totalIssues}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Record Counts */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Object.entries(tableCounts).map(([table, count]) => (
            <Card key={table} className="border">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider">{table.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="text-xl font-bold text-gray-800 mt-1">{count as number}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{tab.count}</Badge>
              )}
              {tab.count === 0 && (
                <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">0</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-500" /> What This Audit Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-xs">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Data Mismatches</div>
                    <div>Checks if a prospect, client, project, or order has a different name/email/phone than its master contact record. If "John Smith" is the master contact but a protocol says "Jon Smith" — that's a mismatch.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-xs">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Missing Links</div>
                    <div>Finds records that have no contactId — meaning they exist in isolation and aren't connected to the unified contact system. These records won't sync when you edit a contact.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-xs">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Orphaned Records</div>
                    <div>Finds records that point to a contactId that no longer exists. This means the master contact was deleted but the linked records still reference it.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-xs">4</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Duplicate Contacts</div>
                    <div>Finds multiple contact records with the same email or phone number. These could cause one person's data to split across two contacts, leading to confusion about which is the "real" record.</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {summary.totalIssues === 0 && (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-green-800">All Clear — No Issues Found</h3>
                  <p className="text-green-700 mt-2">
                    Every record in your database is properly linked to its master contact, all names/emails/phones match, and there are no duplicates. Your single master record system is working correctly.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "mismatches" && (
          <div>
            {mismatches.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-green-800">No Mismatches</h3>
                  <p className="text-green-700 text-sm">All linked records match their master contact data perfectly.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Reassuring context banner */}
                <Card className="border-blue-200 bg-blue-50 mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">These are pre-existing inconsistencies — not new problems.</p>
                        <p className="text-blue-700">
                          These mismatches existed in your database before the unified contact system was added.
                          For example, a protocol might say "Jason Kidman" while the master contact says "Jason Test" —
                          this happened because the old system allowed each section to store names independently.
                          Clicking "Fix" will update the linked record to match the master contact. No data will be lost.
                        </p>
                        <p className="text-blue-700 mt-1">
                          <strong>Important:</strong> Review the "Master Contact Value" column first — that's the value that will be pushed to all linked records.
                          If the master contact value is wrong, edit it in <strong>Client 360</strong> first, then come back and fix.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">
                    Found {mismatches.length} field{mismatches.length !== 1 ? "s" : ""} where linked records differ from the master contact.
                    Click "Fix" to sync the master contact's data to the linked record.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-2 border">Table</th>
                        <th className="text-left p-2 border">Record ID</th>
                        <th className="text-left p-2 border">Field</th>
                        <th className="text-left p-2 border">Master Contact Value</th>
                        <th className="text-left p-2 border">Record Value</th>
                        <th className="text-left p-2 border">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mismatches.map((m, i) => (
                        <tr key={i} className="hover:bg-yellow-50">
                          <td className="p-2 border">
                            <Badge variant="outline" className="text-xs">{m.table}</Badge>
                          </td>
                          <td className="p-2 border font-mono text-xs">#{m.recordId}</td>
                          <td className="p-2 border font-medium">{m.field}</td>
                          <td className="p-2 border text-green-700 bg-green-50">{m.contactValue || "(empty)"}</td>
                          <td className="p-2 border text-red-700 bg-red-50">{m.recordValue || "(empty)"}</td>
                          <td className="p-2 border">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => fixMismatch.mutate({ contactId: m.contactId })}
                              disabled={fixMismatch.isPending}
                            >
                              <Wrench className="w-3 h-3 mr-1" /> Fix
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "missing" && (
          <div>
            {missingLinks.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-green-800">All Records Linked</h3>
                  <p className="text-green-700 text-sm">Every record has a contactId linking it to the master contacts table.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  Found {missingLinks.length} record{missingLinks.length !== 1 ? "s" : ""} without a contactId link.
                  These records exist in isolation and won't sync when you edit a contact.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-2 border">Table</th>
                        <th className="text-left p-2 border">Record ID</th>
                        <th className="text-left p-2 border">Name</th>
                        <th className="text-left p-2 border">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingLinks.map((m, i) => (
                        <tr key={i} className="hover:bg-yellow-50">
                          <td className="p-2 border">
                            <Badge variant="outline" className="text-xs">{m.table}</Badge>
                          </td>
                          <td className="p-2 border font-mono text-xs">#{m.recordId}</td>
                          <td className="p-2 border">{m.name || "(no name)"}</td>
                          <td className="p-2 border">{m.email || "(no email)"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "orphaned" && (
          <div>
            {orphanedRecords.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-green-800">No Orphaned Records</h3>
                  <p className="text-green-700 text-sm">Every contactId reference points to a valid contact record.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  Found {orphanedRecords.length} record{orphanedRecords.length !== 1 ? "s" : ""} pointing to non-existent contacts.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-2 border">Table</th>
                        <th className="text-left p-2 border">Record ID</th>
                        <th className="text-left p-2 border">Missing Contact ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orphanedRecords.map((m, i) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="p-2 border">
                            <Badge variant="outline" className="text-xs">{m.table}</Badge>
                          </td>
                          <td className="p-2 border font-mono text-xs">#{m.recordId}</td>
                          <td className="p-2 border font-mono text-xs text-red-600">Contact #{m.contactId} (deleted)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "duplicates" && (
          <div className="space-y-4">
            {duplicateEmails.length === 0 && duplicatePhones.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-green-800">No Duplicate Contacts</h3>
                  <p className="text-green-700 text-sm">Each email and phone number belongs to exactly one contact. No risk of one contact overriding another.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {duplicateEmails.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Copy className="w-4 h-4 text-orange-500" /> Duplicate Emails ({duplicateEmails.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="text-left p-2 border">Email</th>
                              <th className="text-left p-2 border">Contact IDs</th>
                              <th className="text-left p-2 border">Names</th>
                            </tr>
                          </thead>
                          <tbody>
                            {duplicateEmails.map((d, i) => (
                              <tr key={i} className="hover:bg-orange-50">
                                <td className="p-2 border font-medium">{d.email}</td>
                                <td className="p-2 border font-mono text-xs">{d.contactIds.map(id => `#${id}`).join(', ')}</td>
                                <td className="p-2 border">{d.names.join(' / ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {duplicatePhones.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Copy className="w-4 h-4 text-orange-500" /> Duplicate Phones ({duplicatePhones.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="text-left p-2 border">Phone</th>
                              <th className="text-left p-2 border">Contact IDs</th>
                              <th className="text-left p-2 border">Names</th>
                            </tr>
                          </thead>
                          <tbody>
                            {duplicatePhones.map((d, i) => (
                              <tr key={i} className="hover:bg-orange-50">
                                <td className="p-2 border font-medium">{d.phone}</td>
                                <td className="p-2 border font-mono text-xs">{d.contactIds.map(id => `#${id}`).join(', ')}</td>
                                <td className="p-2 border">{d.names.join(' / ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
