import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  Loader2,
  User,
  Mail,
  Phone,
  MessageSquare
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, isBefore, startOfDay } from "date-fns";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type BookingStep = "type" | "date" | "time" | "details" | "confirmation";

export default function Booking() {
  const [step, setStep] = useState<BookingStep>("type");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [bookingComplete, setBookingComplete] = useState(false);

  // Queries
  const { data: appointmentTypes, isLoading: typesLoading } = trpc.booking.getAppointmentTypes.useQuery();
  const { data: availableSlots, isLoading: slotsLoading } = trpc.booking.getAvailableSlots.useQuery(
    {
      appointmentTypeId: selectedType || 0,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
    },
    { enabled: !!selectedType && !!selectedDate }
  );

  // Mutation
  const createAppointmentMutation = trpc.booking.createAppointment.useMutation({
    onSuccess: () => {
      setBookingComplete(true);
      setStep("confirmation");
    },
  });

  // Calendar navigation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedTypeData = appointmentTypes?.find((t) => t.id === selectedType);

  const handleSelectType = (typeId: number) => {
    setSelectedType(typeId);
    setStep("date");
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("time");
  };

  const handleSelectSlot = (slot: { startTime: string; endTime: string }) => {
    setSelectedSlot(slot);
    setStep("details");
  };

  const handleSubmit = () => {
    if (!selectedType || !selectedSlot || !formData.name || !formData.email) return;

    createAppointmentMutation.mutate({
      appointmentTypeId: selectedType,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      clientName: formData.name,
      clientEmail: formData.email,
      clientPhone: formData.phone || undefined,
      clientNotes: formData.notes || undefined,
    });
  };

  const goBack = () => {
    if (step === "date") setStep("type");
    else if (step === "time") setStep("date");
    else if (step === "details") setStep("time");
  };

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 border-slate-700">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
            <p className="text-slate-400 mb-6">
              Your appointment has been scheduled. You'll receive a confirmation email shortly.
            </p>
            <div className="bg-slate-700/50 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Type</span>
                <span className="text-white">{selectedTypeData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span className="text-white">{selectedDate && format(selectedDate, "MMMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time</span>
                <span className="text-white">
                  {selectedSlot && format(new Date(selectedSlot.startTime), "h:mm a")}
                </span>
              </div>
            </div>
            <Button 
              className="mt-6 w-full bg-orange-500 hover:bg-orange-600"
              onClick={() => window.location.href = "/"}
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Book an Appointment</h1>
          <p className="text-slate-400">Select a service and choose a time that works for you</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {["type", "date", "time", "details"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-orange-500 text-white"
                      : ["type", "date", "time", "details"].indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {["type", "date", "time", "details"].indexOf(step) > i ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 3 && <div className="w-12 h-0.5 bg-slate-700 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Back Button */}
        {step !== "type" && (
          <Button variant="ghost" onClick={goBack} className="mb-4 text-slate-400 hover:text-white">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}

        {/* Step 1: Select Appointment Type */}
        {step === "type" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {typesLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              appointmentTypes?.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all bg-slate-800/50 border-slate-700 hover:border-orange-500 ${
                    selectedType === type.id ? "border-orange-500 ring-2 ring-orange-500/20" : ""
                  }`}
                  onClick={() => handleSelectType(type.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: type.color || "#f97316" }}
                      />
                      <CardTitle className="text-white">{type.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="h-4 w-4" />
                        <span>{type.duration} minutes</span>
                      </div>
                      {type.price && (
                        <div className="text-orange-500 font-medium">${type.price}</div>
                      )}
                      {type.description && (
                        <p className="text-slate-400 mt-2">{type.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {!typesLoading && (!appointmentTypes || appointmentTypes.length === 0) && (
              <div className="col-span-full text-center py-12 text-slate-400">
                No appointment types available at this time.
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Date */}
        {step === "date" && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="border-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold text-white">{format(currentDate, "MMMM yyyy")}</h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="border-slate-600"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isPast = isBefore(day, startOfDay(new Date()));
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={day.toISOString()}
                      disabled={isPast || !isCurrentMonth}
                      className={`
                        h-12 rounded-lg font-medium transition-colors
                        ${!isCurrentMonth ? "text-slate-600" : ""}
                        ${isPast ? "text-slate-600 cursor-not-allowed" : ""}
                        ${isToday(day) ? "ring-2 ring-orange-500" : ""}
                        ${isSelected ? "bg-orange-500 text-white" : ""}
                        ${!isPast && isCurrentMonth && !isSelected ? "text-white hover:bg-slate-700" : ""}
                      `}
                      onClick={() => !isPast && isCurrentMonth && handleSelectDate(day)}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Time */}
        {step === "time" && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                Available Times for {selectedDate && format(selectedDate, "MMMM d, yyyy")}
              </CardTitle>
              <CardDescription>Select a time slot for your {selectedTypeData?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : availableSlots && availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      variant={selectedSlot?.startTime === slot.startTime ? "default" : "outline"}
                      className={
                        selectedSlot?.startTime === slot.startTime
                          ? "bg-orange-500 hover:bg-orange-600"
                          : "border-slate-600 text-white hover:bg-slate-700"
                      }
                      onClick={() => handleSelectSlot(slot)}
                    >
                      {format(new Date(slot.startTime), "h:mm a")}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No available times for this date. Please select another date.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Enter Details */}
        {step === "details" && (
          <Card className="bg-slate-800/50 border-slate-700 max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-white">Your Information</CardTitle>
              <CardDescription>Please provide your contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Phone (optional)</Label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  showCountryCode={true}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Notes (optional)</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information..."
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white min-h-[100px]"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-white">Booking Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Service</span>
                  <span className="text-white">{selectedTypeData?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Date</span>
                  <span className="text-white">{selectedDate && format(selectedDate, "MMMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Time</span>
                  <span className="text-white">
                    {selectedSlot && format(new Date(selectedSlot.startTime), "h:mm a")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Duration</span>
                  <span className="text-white">{selectedTypeData?.duration} minutes</span>
                </div>
                {selectedTypeData?.price && (
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-600">
                    <span className="text-slate-400">Price</span>
                    <span className="text-orange-500 font-medium">${selectedTypeData.price}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleSubmit}
                disabled={!formData.name || !formData.email || createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirm Booking
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
