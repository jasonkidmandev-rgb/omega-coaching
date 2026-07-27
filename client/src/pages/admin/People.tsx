import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { toLocaleDateStringMT } from "@/lib/timezone";

/**
 * ALL PEOPLE — every human in the system, whatever their relationship to us.
 *
 * Why this exists: the Clients page only shows people with an active protocol,
 * and the Team page only shows staff. That left people who registered, ordered
 * from the store, or stalled as a lead with no admin surface at all. This is
 * that surface.
 *
 * "What is this person to us" is derived from which relationship records exist
 * (protocol / prospect / login / orders) — never from a stored label.
 */

type Filter = "all" | "no_protocol" | "store" | "client" | "lead";

const FILTERS: { key: Filter; label: string; hint: string }[] = [
  { key: "all", label: "Everyone", hint: "All people on record" },
  { key: "no_protocol", label: "No protocol", hint: "Registered or ordered, but never had a protocol" },
  { key: "store", label: "Store customers", hint: "Has placed a store order" },
  { key: "client", label: "Clients", hint: "Has a protocol" },
  { key: "lead", label: "Leads / prospects", hint: "In the pipeline, no protocol yet" },
];

export default function People() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading } = trpc.contacts.list.useQuery({
    search: search.trim() || undefined,
    stage: "all",
    limit: 200,
    offset: 0,
  });

  const people = (data?.people ?? []) as any[];

  const filtered = useMemo(() => {
    switch (filter) {
      case "no_protocol":
        return people.filter(p => !p.clientProtocolId);
      case "store":
        return people.filter(p => (p.totalOrders ?? 0) > 0);
      case "client":
        return people.filter(p => !!p.clientProtocolId);
      case "lead":
        return people.filter(p => !p.clientProtocolId && !!p.prospectId);
      default:
        return people;
    }
  }, [people, filter]);

  // Badges are DERIVED from relationship records, not from a stored label.
  const badgesFor = (p: any) => {
    const out: { label: string; className: string }[] = [];
    if (p.clientProtocolId) {
      out.push({ label: "Client", className: "bg-green-100 text-green-700 border-green-200" });
    }
    if (p.prospectId) {
      out.push({ label: "Lead", className: "bg-blue-100 text-blue-700 border-blue-200" });
    }
    if ((p.totalOrders ?? 0) > 0) {
      out.push({
        label: `Store customer (${p.totalOrders})`,
        className: "bg-purple-100 text-purple-700 border-purple-200",
      });
    }
    if (p.enrollmentId) {
      out.push({ label: "Enrolled", className: "bg-amber-100 text-amber-700 border-amber-200" });
    }
    if (out.length === 0) {
      out.push({
        label: p.userId ? "Registered — no activity" : "On record only",
        className: "bg-gray-100 text-gray-600 border-gray-200",
      });
    }
    return out;
  };

  const noProtocolCount = people.filter(p => !p.clientProtocolId).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            All People
          </h1>
          <p className="text-muted-foreground mt-1">
            Everyone on record — clients, leads, store customers and registered users alike.
            The Clients page only shows people with an active protocol; this shows the rest too.
          </p>
        </div>

        {noProtocolCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{noProtocolCount}</strong> {noProtocolCount === 1 ? "person has" : "people have"} no
              protocol — they registered, ordered from the store, or stalled as a lead. They do not appear
              on the Clients page.
            </p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              title={f.hint}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading people...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No people match this view.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Showing {filtered.length} of {people.length}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-2 pr-3 font-medium">Name</th>
                        <th className="py-2 pr-3 font-medium">Contact</th>
                        <th className="py-2 pr-3 font-medium">What they are</th>
                        <th className="py-2 pr-3 font-medium">Added</th>
                        <th className="py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
                          <td className="py-2.5 pr-3 font-medium">{p.name || "—"}</td>
                          <td className="py-2.5 pr-3 text-muted-foreground">
                            <div>{p.email || "no email"}</div>
                            {p.phone && <div className="text-xs">{p.phone}</div>}
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {badgesFor(p).map((b, i) => (
                                <Badge key={i} variant="outline" className={`text-xs ${b.className}`}>
                                  {b.label}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-muted-foreground text-xs">
                            {p.createdAt ? toLocaleDateStringMT(p.createdAt) : "—"}
                          </td>
                          <td className="py-2.5">
                            {p.clientProtocolId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setLocation(`/admin/clients/${p.clientProtocolId}`)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Protocol
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
