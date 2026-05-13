import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, Clock, Users, Settings2, AlertCircle, CheckCircle, 
  ChevronDown, ChevronUp, Filter
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
];

const TIMEZONES = [
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (LA)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
];

export default function BulkScheduleUpdate() {
  const [filterDay, setFilterDay] = useState<number | undefined>();
  const [filterFrequency, setFilterFrequency] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // New schedule values
  const [newDayOfWeek, setNewDayOfWeek] = useState<number | undefined>();
  const [newTimeOfDay, setNewTimeOfDay] = useState<string | undefined>();
  const [newFrequency, setNewFrequency] = useState<string | undefined>();
  const [newTimezone, setNewTimezone] = useState<string | undefined>();

  // Fetch all schedules
  const { data: schedules, isLoading, refetch } = trpc.checkin.schedules.listAll.useQuery({
    dayOfWeek: filterDay,
    frequency: filterFrequency as 'weekly' | 'biweekly' | 'monthly' | undefined,
    isEnabled: true,
  });

  // Bulk update mutation
  const bulkUpdateMutation = trpc.checkin.schedules.bulkUpdate.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Successfully updated ${result.summary.succeeded} schedule(s)`);
      } else {
        toast.warning(`Updated ${result.summary.succeeded} of ${result.summary.total} schedules. ${result.summary.failed} failed.`);
      }
      setSelectedIds([]);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSelectAll = () => {
    if (!schedules) return;
    if (selectedIds.length === schedules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(schedules.map(s => s.schedule.clientProtocolId));
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkUpdate = () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one schedule to update");
      return;
    }

    if (!newDayOfWeek && !newTimeOfDay && !newFrequency && !newTimezone) {
      toast.error("Please specify at least one setting to update");
      return;
    }

    bulkUpdateMutation.mutate({
      clientProtocolIds: selectedIds,
      dayOfWeek: newDayOfWeek,
      timeOfDay: newTimeOfDay,
      frequency: newFrequency as 'weekly' | 'biweekly' | 'monthly' | undefined,
      timezone: newTimezone,
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Schedule Update
          </CardTitle>
          <CardDescription>
            Update check-in schedules for multiple clients at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="mb-2"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
            
            {showFilters && (
              <div className="grid gap-4 md:grid-cols-3 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label>Filter by Day</Label>
                  <Select 
                    value={filterDay?.toString() ?? "all"} 
                    onValueChange={(v) => setFilterDay(v === "all" ? undefined : parseInt(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filter by Frequency</Label>
                  <Select 
                    value={filterFrequency ?? "all"} 
                    onValueChange={(v) => setFilterFrequency(v === "all" ? undefined : v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All frequencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Frequencies</SelectItem>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilterDay(undefined);
                      setFilterFrequency(undefined);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* New Values Section */}
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              New Schedule Settings
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Leave fields empty to keep current values. Only filled fields will be updated.
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>New Day</Label>
                <Select 
                  value={newDayOfWeek?.toString() ?? ""} 
                  onValueChange={(v) => setNewDayOfWeek(v ? parseInt(v) : undefined)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Keep current" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>New Time</Label>
                <Input
                  type="time"
                  value={newTimeOfDay ?? ""}
                  onChange={(e) => setNewTimeOfDay(e.target.value || undefined)}
                  className="mt-1"
                  placeholder="Keep current"
                />
              </div>
              <div>
                <Label>New Frequency</Label>
                <Select 
                  value={newFrequency ?? ""} 
                  onValueChange={(v) => setNewFrequency(v || undefined)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Keep current" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>New Timezone</Label>
                <Select 
                  value={newTimezone ?? ""} 
                  onValueChange={(v) => setNewTimezone(v || undefined)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Keep current" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={schedules && selectedIds.length === schedules.length && schedules.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">
                {selectedIds.length} of {schedules?.length ?? 0} selected
              </span>
            </div>
            <Button
              onClick={handleBulkUpdate}
              disabled={selectedIds.length === 0 || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? "Updating..." : `Update ${selectedIds.length} Schedule(s)`}
            </Button>
          </div>

          {/* Schedule List */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !schedules?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No active schedules found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {schedules.map(({ schedule, clientProtocol }) => (
                <div
                  key={schedule.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.includes(schedule.clientProtocolId)
                      ? 'bg-primary/5 border-primary/30'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleToggleSelect(schedule.clientProtocolId)}
                >
                  <Checkbox
                    checked={selectedIds.includes(schedule.clientProtocolId)}
                    onCheckedChange={() => handleToggleSelect(schedule.clientProtocolId)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {clientProtocol?.clientName || `Client #${schedule.clientProtocolId}`}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {clientProtocol?.clientEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {dayNames[schedule.dayOfWeek ?? 4]}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {schedule.timeOfDay}
                    </Badge>
                    <Badge variant="secondary">
                      {schedule.frequency}
                    </Badge>
                  </div>
                  {schedule.nextScheduledAt && (
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Next:</p>
                      <p>{format(new Date(schedule.nextScheduledAt), 'MMM d')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
