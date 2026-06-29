import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { toLocaleDateStringMT, toLocaleTimeStringMT } from "../../lib/timezone";
import AdminLayout from "@/components/AdminLayout";
import { Calendar, Clock, User, Mail, Video, Filter, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Globe } from "lucide-react";

// Unified appointment shape for display
interface DisplayAppointment {
  id: string;
  clientName: string;
  clientEmail: string;
  eventTypeName: string;
  startTime: string;
  endTime: string;
  status: string;
  duration: number;
  joinUrl: string | null;
  locationType: string | null;
  source: "calendly" | "local";
  invitees?: Array<{ name: string; email: string; timezone: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  canceled: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-600",
  no_show: "bg-yellow-100 text-yellow-800",
};

function formatDate(dateStr: string) {
  return toLocaleDateStringMT(dateStr, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string) {
  return toLocaleTimeStringMT(dateStr, { hour: "numeric", minute: "2-digit" });
}

function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function groupByDate(appointments: DisplayAppointment[]): Record<string, DisplayAppointment[]> {
  const groups: Record<string, DisplayAppointment[]> = {};
  for (const appt of appointments) {
    const dateKey = new Date(appt.startTime).toISOString().split("T")[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(appt);
  }
  return groups;
}

function getLocationLabel(locationType: string | null): string {
  if (!locationType) return "";
  const map: Record<string, string> = {
    zoom: "Zoom",
    microsoft_teams_conference: "Teams",
    google_meet: "Google Meet",
    phone_call: "Phone",
    in_person_meeting: "In Person",
    custom: "Custom",
  };
  return map[locationType] || locationType;
}

export default function UpcomingAppointments() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  // Fetch Calendly appointments
  const {
    data: calendlyData,
    isLoading: calendlyLoading,
    refetch: refetchCalendly,
    isFetching: calendlyFetching,
  } = trpc.calendly.getAppointments.useQuery(
    { pastDays: 14, futureDays: 56, includeCanceled: false },
    { refetchOnWindowFocus: false, staleTime: 3 * 60 * 1000 }
  );

  // Also fetch local appointments as fallback
  const { data: localData, isLoading: localLoading } = trpc.booking.getUpcomingAppointments.useQuery({ limit: 100 });

  const isLoading = calendlyLoading && localLoading;

  // Transform Calendly data to display format
  const calendlyAppointments: DisplayAppointment[] = (calendlyData?.appointments || []).map((a: any) => ({
    id: `cal-${a.id}`,
    clientName: a.invitees?.[0]?.name || a.name,
    clientEmail: a.invitees?.[0]?.email || "",
    eventTypeName: a.eventTypeName || a.name,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    duration: a.duration,
    joinUrl: a.joinUrl,
    locationType: a.locationType,
    source: "calendly" as const,
    invitees: a.invitees,
  }));

  // Transform local appointments
  const localAppointments: DisplayAppointment[] = (localData || []).map((item: any) => ({
    id: `local-${item.appointment.id}`,
    clientName: item.appointment.clientName,
    clientEmail: item.appointment.clientEmail,
    eventTypeName: item.appointmentType?.name || "Appointment",
    startTime: item.appointment.startTime,
    endTime: item.appointment.endTime,
    status: item.appointment.status,
    duration: item.appointmentType?.duration || 30,
    joinUrl: item.appointment.meetingLink,
    locationType: null,
    source: "local" as const,
  }));

  // Merge and deduplicate (prefer Calendly data)
  const allAppointments = [...calendlyAppointments, ...localAppointments];
  // Sort by start time
  allAppointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Filter
  const filtered = allAppointments.filter((a) => {
    if (typeFilter !== "all" && a.eventTypeName !== typeFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  // Get unique types for filter
  const uniqueTypes = [...new Set(allAppointments.map((a) => a.eventTypeName).filter(Boolean))].sort();

  // Group by date for timeline view
  const grouped = groupByDate(filtered);
  const sortedDates = Object.keys(grouped).sort();

  // Stats
  const now = new Date();
  const upcomingOnly = allAppointments.filter((a) => new Date(a.startTime) >= now);
  const recentPast = allAppointments.filter((a) => new Date(a.startTime) < now);
  const totalUpcoming = upcomingOnly.length;
  const thisWeek = upcomingOnly.filter((a) => daysUntil(a.startTime) <= 7 && daysUntil(a.startTime) >= 0).length;
  const discoveryCount = allAppointments.filter((a) => a.eventTypeName?.toLowerCase().includes("discovery")).length;
  const strategyCount = allAppointments.filter((a) => a.eventTypeName?.toLowerCase().includes("strategy")).length;
  const recentCount = recentPast.length;

  const handleRefresh = () => {
    refetchCalendly();
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">
            Recent &amp; upcoming appointments synced from Calendly.
            {calendlyData?.configured === false && (
              <span className="text-amber-600 ml-2">(Calendly not configured)</span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={calendlyFetching}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          title="Refresh from Calendly"
        >
          <RefreshCw className={`w-4 h-4 ${calendlyFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{totalUpcoming}</div>
          <div className="text-sm text-gray-500">Upcoming</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-gray-500">{recentCount}</div>
          <div className="text-sm text-gray-500">Past 2 Weeks</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-orange-600">{thisWeek}</div>
          <div className="text-sm text-gray-500">This Week</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">{discoveryCount}</div>
          <div className="text-sm text-gray-500">Discovery Calls</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{strategyCount}</div>
          <div className="text-sm text-gray-500">Strategy Sessions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border rounded-md px-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t!}>{t}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border rounded-md px-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
          </select>

          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm rounded-md ${viewMode === "list" ? "bg-orange-100 text-orange-700" : "text-gray-500 hover:bg-gray-100"}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 text-sm rounded-md ${viewMode === "timeline" ? "bg-orange-100 text-orange-700" : "text-gray-500 hover:bg-gray-100"}`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading appointments from Calendly...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No appointments found</p>
          <p className="text-gray-400 text-sm mt-1">
            {calendlyData?.configured === false
              ? "Calendly API token not configured. Add it in Settings."
              : "No appointments in the selected date range or filters."}
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="bg-white rounded-lg border divide-y">
          {filtered.map((appt) => {
            const days = daysUntil(appt.startTime);
            const isPast = days < 0;
            const isExpanded = expandedId === appt.id;

            return (
              <div key={appt.id} className={`hover:bg-gray-50 transition-colors ${isPast ? "opacity-70" : ""}`}>
                <div
                  className="p-4 cursor-pointer flex items-center gap-4"
                  onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                >
                  {/* Date badge */}
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="text-xs text-gray-400 uppercase">
                      {toLocaleDateStringMT(appt.startTime, { weekday: "short" })}
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {new Date(appt.startTime).getDate()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {toLocaleDateStringMT(appt.startTime, { month: "short" })}
                    </div>
                  </div>

                  {/* Type color bar */}
                  <div className="w-1 h-12 rounded-full flex-shrink-0 bg-orange-400" />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{appt.clientName}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[appt.status] || "bg-gray-100"}`}>
                        {appt.status}
                      </span>
                      {appt.source === "calendly" && (
                        <span className="text-xs text-gray-400" title="From Calendly">
                          <Globe className="w-3 h-3 inline" />
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {appt.eventTypeName} • {formatTimeRange(appt.startTime, appt.endTime)}
                      {appt.locationType && (
                        <span className="ml-2 text-xs text-gray-400">({getLocationLabel(appt.locationType)})</span>
                      )}
                    </div>
                  </div>

                  {/* Days until */}
                  <div className="flex-shrink-0 text-right">
                    {isPast ? (
                      <span className="text-xs text-gray-400">{Math.abs(days)}d ago</span>
                    ) : days === 0 ? (
                      <span className="text-sm font-semibold text-red-600">Today</span>
                    ) : days === 1 ? (
                      <span className="text-sm font-semibold text-orange-600">Tomorrow</span>
                    ) : days <= 7 ? (
                      <span className="text-sm text-orange-500">{days} days</span>
                    ) : (
                      <span className="text-sm text-gray-400">{days} days</span>
                    )}
                  </div>

                  {/* Expand icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 ml-20 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {appt.clientEmail && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <a href={`mailto:${appt.clientEmail}`} className="text-blue-600 hover:underline">
                            {appt.clientEmail}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{appt.duration} minutes</span>
                      </div>
                    </div>

                    {/* Show all invitees if multiple */}
                    {appt.invitees && appt.invitees.length > 1 && (
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="text-xs font-medium text-gray-500 mb-2">All Invitees</div>
                        {appt.invitees.map((inv, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <User className="w-3 h-3" />
                            <span>{inv.name}</span>
                            <span className="text-gray-400">•</span>
                            <a href={`mailto:${inv.email}`} className="text-blue-600 hover:underline text-xs">{inv.email}</a>
                            {inv.timezone && <span className="text-xs text-gray-400">({inv.timezone})</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {appt.joinUrl && (
                      <a
                        href={appt.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100"
                      >
                        <Video className="w-4 h-4" />
                        Join {getLocationLabel(appt.locationType) || "Meeting"}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Timeline View */
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const dayAppts = grouped[dateKey];
            const days = daysUntil(dateKey + "T00:00:00");
            const isToday = days <= 0 && days > -1;
            const isTomorrow = days === 1;
            const isPast = days < 0;

            return (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`text-sm font-semibold ${isToday ? "text-red-600" : isTomorrow ? "text-orange-600" : isPast ? "text-gray-400" : "text-gray-700"}`}>
                    {isToday ? "Today" : isTomorrow ? "Tomorrow" : formatDate(dateKey + "T00:00:00")}
                    {isPast && !isToday && <span className="ml-1 text-xs font-normal">(past)</span>}
                  </div>
                  <div className="flex-1 h-px bg-gray-200" />
                  <div className="text-xs text-gray-400">{dayAppts.length} appointment{dayAppts.length !== 1 ? "s" : ""}</div>
                </div>

                <div className={`space-y-2 ml-4 border-l-2 ${isPast ? "border-gray-100" : "border-gray-200"} pl-4`}>
                  {dayAppts.map((appt) => (
                    <div
                      key={appt.id}
                      className={`bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow cursor-pointer ${isPast ? "opacity-70" : ""}`}
                      onClick={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-orange-400" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{appt.clientName}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{appt.eventTypeName}</span>
                            {appt.source === "calendly" && (
                              <Globe className="w-3 h-3 text-gray-300" title="From Calendly" />
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">{formatTimeRange(appt.startTime, appt.endTime)}</div>
                      </div>

                      {expandedId === appt.id && (
                        <div className="mt-3 pt-3 border-t text-sm space-y-2">
                          <div className="flex flex-wrap gap-4 text-gray-600">
                            {appt.clientEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {appt.clientEmail}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {appt.duration} min
                            </span>
                          </div>
                          {appt.joinUrl && (
                            <a href={appt.joinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              <Video className="w-3 h-3" /> Join {getLocationLabel(appt.locationType) || "Meeting"} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Source info */}
      {!isLoading && allAppointments.length > 0 && (
        <div className="text-xs text-gray-400 text-center">
          Showing {filtered.length} of {allAppointments.length} appointments
          {calendlyData?.cachedAt && (
            <span> • Last synced {toLocaleTimeStringMT(calendlyData.cachedAt)}</span>
          )}
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
