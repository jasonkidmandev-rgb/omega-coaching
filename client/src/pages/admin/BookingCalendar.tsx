import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Calendar, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Users, 
  Video,
  X,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Edit,
  CalendarDays,
  Ban
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO } from "date-fns";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return [`${hour}:00`, `${hour}:30`];
}).flat();

type Appointment = {
  id: number;
  clientName: string;
  clientEmail: string;
  startTime: Date;
  endTime: Date;
  status: string;
  appointmentType?: { name: string; color: string | null } | null;
};

export default function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showAppointmentTypeDialog, setShowAppointmentTypeDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "availability" | "types">("calendar");

  // Availability form state
  const [availabilitySlots, setAvailabilitySlots] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    enabled: boolean;
  }[]>(
    DAYS_OF_WEEK.map((_, i) => ({
      dayOfWeek: i,
      startTime: "09:00",
      endTime: "17:00",
      enabled: i >= 1 && i <= 5, // Mon-Fri enabled by default
    }))
  );

  // Blocked slot form state
  const [blockedSlot, setBlockedSlot] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    isAllDay: true,
  });

  // Appointment type form state
  const [appointmentTypeForm, setAppointmentTypeForm] = useState({
    name: "",
    description: "",
    duration: 60,
    price: "",
    color: "#f97316",
    allowOnlineBooking: true,
    requiresApproval: false,
    bufferBefore: 15,
    bufferAfter: 15,
  });

  // Queries
  const { data: appointments, isLoading: appointmentsLoading, refetch: refetchAppointments } = 
    trpc.booking.getAppointments.useQuery({});
  const { data: availability, refetch: refetchAvailability } = 
    trpc.booking.getAvailability.useQuery({});
  const { data: blockedSlots, refetch: refetchBlocked } = 
    trpc.booking.getBlockedSlots.useQuery({});
  const { data: appointmentTypes, refetch: refetchTypes } = 
    trpc.booking.getAppointmentTypes.useQuery();
  const { data: dashboardStats } = trpc.booking.getDashboardStats.useQuery();

  // Mutations
  const setAvailabilityMutation = trpc.booking.setAvailability.useMutation({
    onSuccess: () => {
      refetchAvailability();
      setShowAvailabilityDialog(false);
    },
  });

  const createBlockedSlotMutation = trpc.booking.createBlockedSlot.useMutation({
    onSuccess: () => {
      refetchBlocked();
      setShowBlockedDialog(false);
      setBlockedSlot({ startDate: "", endDate: "", reason: "", isAllDay: true });
    },
  });

  const deleteBlockedSlotMutation = trpc.booking.deleteBlockedSlot.useMutation({
    onSuccess: () => refetchBlocked(),
  });

  const updateAppointmentStatusMutation = trpc.booking.updateAppointmentStatus.useMutation({
    onSuccess: () => {
      refetchAppointments();
      setShowAppointmentDialog(false);
      setSelectedAppointment(null);
    },
  });

  const createAppointmentTypeMutation = trpc.booking.createAppointmentType.useMutation({
    onSuccess: () => {
      refetchTypes();
      setShowAppointmentTypeDialog(false);
      setAppointmentTypeForm({
        name: "",
        description: "",
        duration: 60,
        price: "",
        color: "#f97316",
        allowOnlineBooking: true,
        requiresApproval: false,
        bufferBefore: 15,
        bufferAfter: 15,
      });
    },
  });

  // Calendar navigation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) => {
    if (!appointments) return [];
    return appointments.filter((apt) => 
      isSameDay(new Date(apt.appointment.startTime), date)
    );
  };

  const handleSaveAvailability = () => {
    const enabledSlots = availabilitySlots
      .filter((slot) => slot.enabled)
      .map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
    setAvailabilityMutation.mutate({ slots: enabledSlots });
  };

  const handleCreateBlockedSlot = () => {
    if (!blockedSlot.startDate || !blockedSlot.endDate) return;
    createBlockedSlotMutation.mutate({
      startDate: blockedSlot.startDate,
      endDate: blockedSlot.endDate,
      reason: blockedSlot.reason,
      isAllDay: blockedSlot.isAllDay,
    });
  };

  const handleCreateAppointmentType = () => {
    if (!appointmentTypeForm.name) return;
    createAppointmentTypeMutation.mutate({
      name: appointmentTypeForm.name,
      description: appointmentTypeForm.description,
      duration: appointmentTypeForm.duration,
      price: appointmentTypeForm.price || undefined,
      color: appointmentTypeForm.color,
      allowOnlineBooking: appointmentTypeForm.allowOnlineBooking,
      requiresApproval: appointmentTypeForm.requiresApproval,
      bufferBefore: appointmentTypeForm.bufferBefore,
      bufferAfter: appointmentTypeForm.bufferAfter,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Booking Calendar</h1>
            <p className="text-muted-foreground mt-1">Manage appointments, availability, and scheduling</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAvailabilityDialog(true)}>
              <Clock className="h-4 w-4 mr-2" />
              Set Hours
            </Button>
            <Button variant="outline" onClick={() => setShowBlockedDialog(true)}>
              <Ban className="h-4 w-4 mr-2" />
              Block Time
            </Button>
            <Button onClick={() => setShowAppointmentTypeDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Type
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.todayCount || 0}</div>
              <p className="text-xs text-muted-foreground">appointments scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.weekCount || 0}</div>
              <p className="text-xs text-muted-foreground">total appointments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.pendingConfirmations || 0}</div>
              <p className="text-xs text-muted-foreground">need confirmation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appointment Types</CardTitle>
              <Settings className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointmentTypes?.length || 0}</div>
              <p className="text-xs text-muted-foreground">active types</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === "calendar" ? "default" : "ghost"}
            onClick={() => setActiveTab("calendar")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={activeTab === "availability" ? "default" : "ghost"}
            onClick={() => setActiveTab("availability")}
          >
            <Clock className="h-4 w-4 mr-2" />
            Availability
          </Button>
          <Button
            variant={activeTab === "types" ? "default" : "ghost"}
            onClick={() => setActiveTab("types")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Appointment Types
          </Button>
        </div>

        {/* Calendar View */}
        {activeTab === "calendar" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                        ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""}
                        ${isToday(day) ? "border-orange-500 border-2" : "border-border"}
                        ${isSelected ? "bg-orange-500/10" : "hover:bg-muted/50"}
                      `}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="font-medium text-sm mb-1">{format(day, "d")}</div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 3).map((apt) => (
                          <div
                            key={apt.appointment.id}
                            className="text-xs p-1 rounded truncate"
                            style={{ backgroundColor: apt.appointmentType?.color || "#f97316", color: "white" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment({
                                id: apt.appointment.id,
                                clientName: apt.appointment.clientName,
                                clientEmail: apt.appointment.clientEmail,
                                startTime: new Date(apt.appointment.startTime),
                                endTime: new Date(apt.appointment.endTime),
                                status: apt.appointment.status,
                                appointmentType: apt.appointmentType,
                              });
                              setShowAppointmentDialog(true);
                            }}
                          >
                            {format(new Date(apt.appointment.startTime), "HH:mm")} {apt.appointment.clientName}
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayAppointments.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Availability View */}
        {activeTab === "availability" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Availability</CardTitle>
                <CardDescription>Set your regular working hours for each day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {availabilitySlots.map((slot, index) => (
                  <div key={slot.dayOfWeek} className="flex items-center gap-4">
                    <div className="w-24">
                      <Switch
                        checked={slot.enabled}
                        onCheckedChange={(checked) => {
                          const newSlots = [...availabilitySlots];
                          newSlots[index].enabled = checked;
                          setAvailabilitySlots(newSlots);
                        }}
                      />
                    </div>
                    <div className="w-24 font-medium">{DAYS_OF_WEEK[slot.dayOfWeek]}</div>
                    {slot.enabled ? (
                      <>
                        <Select
                          value={slot.startTime}
                          onValueChange={(value) => {
                            const newSlots = [...availabilitySlots];
                            newSlots[index].startTime = value;
                            setAvailabilitySlots(newSlots);
                          }}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>to</span>
                        <Select
                          value={slot.endTime}
                          onValueChange={(value) => {
                            const newSlots = [...availabilitySlots];
                            newSlots[index].endTime = value;
                            setAvailabilitySlots(newSlots);
                          }}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unavailable</span>
                    )}
                  </div>
                ))}
                <Button 
                  onClick={handleSaveAvailability} 
                  className="w-full mt-4"
                  disabled={setAvailabilityMutation.isPending}
                >
                  {setAvailabilityMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Availability
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Blocked Time</CardTitle>
                <CardDescription>Vacation, holidays, or other unavailable periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {blockedSlots?.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {format(new Date(slot.startDate), "MMM d, yyyy")} - {format(new Date(slot.endDate), "MMM d, yyyy")}
                        </div>
                        {slot.reason && <div className="text-sm text-muted-foreground">{slot.reason}</div>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBlockedSlotMutation.mutate({ id: slot.id })}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {(!blockedSlots || blockedSlots.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      No blocked time periods
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Appointment Types View */}
        {activeTab === "types" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointmentTypes?.map((type) => (
              <Card key={type.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: type.color || "#f97316" }}
                    />
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{type.duration} minutes</span>
                    </div>
                    {type.price && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price</span>
                        <span>${type.price}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Online Booking</span>
                      <span>{type.allowOnlineBooking ? "Yes" : "No"}</span>
                    </div>
                    {type.description && (
                      <p className="text-muted-foreground mt-2">{type.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add New Type Card */}
            <Card 
              className="border-dashed cursor-pointer hover:border-orange-500 transition-colors"
              onClick={() => setShowAppointmentTypeDialog(true)}
            >
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[150px]">
                <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-muted-foreground">Add Appointment Type</span>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Availability Dialog */}
      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Working Hours</DialogTitle>
            <DialogDescription>Configure your regular availability for appointments</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {availabilitySlots.map((slot, index) => (
              <div key={slot.dayOfWeek} className="flex items-center gap-3">
                <Switch
                  checked={slot.enabled}
                  onCheckedChange={(checked) => {
                    const newSlots = [...availabilitySlots];
                    newSlots[index].enabled = checked;
                    setAvailabilitySlots(newSlots);
                  }}
                />
                <span className="w-20 text-sm">{DAYS_OF_WEEK[slot.dayOfWeek].slice(0, 3)}</span>
                {slot.enabled && (
                  <>
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => {
                        const newSlots = [...availabilitySlots];
                        newSlots[index].startTime = e.target.value;
                        setAvailabilitySlots(newSlots);
                      }}
                      className="w-24"
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => {
                        const newSlots = [...availabilitySlots];
                        newSlots[index].endTime = e.target.value;
                        setAvailabilitySlots(newSlots);
                      }}
                      className="w-24"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvailabilityDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAvailability} disabled={setAvailabilityMutation.isPending}>
              {setAvailabilityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked Time Dialog */}
      <Dialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Time Off</DialogTitle>
            <DialogDescription>Add vacation, holidays, or other unavailable periods</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={blockedSlot.startDate}
                  onChange={(e) => setBlockedSlot({ ...blockedSlot, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={blockedSlot.endDate}
                  onChange={(e) => setBlockedSlot({ ...blockedSlot, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                value={blockedSlot.reason}
                onChange={(e) => setBlockedSlot({ ...blockedSlot, reason: e.target.value })}
                placeholder="e.g., Vacation, Conference, Holiday"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={blockedSlot.isAllDay}
                onCheckedChange={(checked) => setBlockedSlot({ ...blockedSlot, isAllDay: checked })}
              />
              <Label>All day</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockedDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBlockedSlot} disabled={createBlockedSlotMutation.isPending}>
              {createBlockedSlotMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Block Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Details Dialog */}
      <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedAppointment.appointmentType?.color || "#f97316" }}
                />
                <span className="font-medium">{selectedAppointment.appointmentType?.name || "Appointment"}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Client</span>
                  <p className="font-medium">{selectedAppointment.clientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium">{selectedAppointment.clientEmail}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{format(selectedAppointment.startTime, "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time</span>
                  <p className="font-medium">
                    {format(selectedAppointment.startTime, "h:mm a")} - {format(selectedAppointment.endTime, "h:mm a")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{selectedAppointment.status}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => updateAppointmentStatusMutation.mutate({
                    id: selectedAppointment.id,
                    status: "confirmed",
                  })}
                  disabled={selectedAppointment.status === "confirmed"}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => updateAppointmentStatusMutation.mutate({
                    id: selectedAppointment.id,
                    status: "completed",
                  })}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Complete
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => updateAppointmentStatusMutation.mutate({
                    id: selectedAppointment.id,
                    status: "cancelled",
                  })}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Appointment Type Dialog */}
      <Dialog open={showAppointmentTypeDialog} onOpenChange={setShowAppointmentTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Appointment Type</DialogTitle>
            <DialogDescription>Define a new type of appointment clients can book</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={appointmentTypeForm.name}
                onChange={(e) => setAppointmentTypeForm({ ...appointmentTypeForm, name: e.target.value })}
                placeholder="e.g., Initial Consultation"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={appointmentTypeForm.description}
                onChange={(e) => setAppointmentTypeForm({ ...appointmentTypeForm, description: e.target.value })}
                placeholder="Describe what this appointment includes..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={appointmentTypeForm.duration}
                  onChange={(e) => setAppointmentTypeForm({ ...appointmentTypeForm, duration: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div>
                <Label>Price ($)</Label>
                <Input
                  value={appointmentTypeForm.price}
                  onChange={(e) => setAppointmentTypeForm({ ...appointmentTypeForm, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b"].map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${appointmentTypeForm.color === color ? "border-white ring-2 ring-offset-2 ring-offset-background" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setAppointmentTypeForm({ ...appointmentTypeForm, color })}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Buffer Before (min)</Label>
                <Input
                  type="number"
                  value={appointmentTypeForm.bufferBefore}
                  onChange={(e) => setAppointmentTypeForm({ ...appointmentTypeForm, bufferBefore: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Buffer After (min)</Label>
                <Input
                  type="number"
                  value={appointmentTypeForm.bufferAfter}
                  onChange={(e) => setAppointmentTypeForm({ ...appointmentTypeForm, bufferAfter: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Online Booking</Label>
              <Switch
                checked={appointmentTypeForm.allowOnlineBooking}
                onCheckedChange={(checked) => setAppointmentTypeForm({ ...appointmentTypeForm, allowOnlineBooking: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Requires Approval</Label>
              <Switch
                checked={appointmentTypeForm.requiresApproval}
                onCheckedChange={(checked) => setAppointmentTypeForm({ ...appointmentTypeForm, requiresApproval: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppointmentTypeDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateAppointmentType} disabled={createAppointmentTypeMutation.isPending}>
              {createAppointmentTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
