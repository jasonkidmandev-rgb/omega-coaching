import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Video,
  Phone,
  MapPin,
  ChevronRight,
  ArrowLeft,
  CalendarPlus,
  Loader2,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";

export default function ClientSessions() {
  const { user, loading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch client's session packages
  const { data: sessionPackages, isLoading: isPackagesLoading } = trpc.booking.getMySessionPackages.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch upcoming appointments
  const { data: upcomingAppointments, isLoading: isAppointmentsLoading } = trpc.booking.getMyAppointments.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch past appointments for history
  const { data: pastAppointments, isLoading: isPastLoading } = trpc.booking.getMyPastAppointments.useQuery(
    undefined,
    { enabled: !!user }
  );

  const isLoading = isAuthLoading || isPackagesLoading || isAppointmentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view your sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600"
              onClick={() => window.location.href = getLoginUrl('/sessions')}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total sessions across all packages
  const totalSessions = sessionPackages?.reduce((sum: number, pkg: any) => {
    const total = (pkg.package?.sessionCount || 0) + (pkg.package?.bonusSessions || 0);
    return sum + total;
  }, 0) || 0;

  const usedSessions = sessionPackages?.reduce((sum: number, pkg: any) => {
    return sum + (pkg.clientPackage?.sessionsUsed || 0);
  }, 0) || 0;

  const remainingSessions = sessionPackages?.reduce((sum: number, pkg: any) => {
    return sum + (pkg.clientPackage?.sessionsRemaining || 0);
  }, 0) || 0;

  const progressPercent = totalSessions > 0 ? (usedSessions / totalSessions) * 100 : 0;

  const getAppointmentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
      case 'zoom':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-700">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      case 'no_show':
        return <Badge className="bg-orange-100 text-orange-700">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAppointmentDate = (date: string | Date) => {
    const d = new Date(date);
    if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
    if (isTomorrow(d)) return `Tomorrow at ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, yyyy • h:mm a');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Coaching Sessions</h1>
              <p className="text-sm text-gray-500">Track and manage your sessions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Session Summary Card */}
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-indigo-100 text-sm">Session Balance</p>
                <p className="text-4xl font-bold">{remainingSessions}</p>
                <p className="text-indigo-200 text-sm">sessions remaining</p>
              </div>
              <div className="text-right">
                <div className="bg-white/20 rounded-full p-4">
                  <Calendar className="h-8 w-8" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-indigo-100">Progress</span>
                <span className="text-white font-medium">{usedSessions} of {totalSessions} used</span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-white/20" />
            </div>

            {remainingSessions <= 2 && remainingSessions > 0 && (
              <div className="mt-4 p-3 bg-white/10 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-300" />
                <span className="text-sm">Running low on sessions - consider purchasing more</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Packages */}
        {sessionPackages && sessionPackages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" />
                My Session Packages
              </CardTitle>
              <CardDescription>Your active coaching packages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionPackages.map((pkg: any, index: number) => {
                const totalPkgSessions = (pkg.package?.sessionCount || 0) + (pkg.package?.bonusSessions || 0);
                const usedPkgSessions = pkg.clientPackage?.sessionsUsed || 0;
                const remainingPkgSessions = pkg.clientPackage?.sessionsRemaining || 0;
                const pkgProgress = totalPkgSessions > 0 ? (usedPkgSessions / totalPkgSessions) * 100 : 0;
                
                return (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{pkg.package?.name || 'Coaching Package'}</h4>
                        <p className="text-sm text-gray-500">{pkg.package?.description || 'Session package'}</p>
                      </div>
                      <Badge className={pkg.clientPackage?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {pkg.clientPackage?.status || 'Active'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">{totalPkgSessions}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">{remainingPkgSessions}</p>
                        <p className="text-xs text-gray-500">Remaining</p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <p className="text-2xl font-bold text-blue-600">{usedPkgSessions}</p>
                        <p className="text-xs text-gray-500">Used</p>
                      </div>
                    </div>
                    
                    <Progress value={pkgProgress} className="h-2" />
                    
                    {pkg.package?.bonusSessions > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                        <Sparkles className="h-3 w-3" />
                        Includes {pkg.package.bonusSessions} bonus session{pkg.package.bonusSessions > 1 ? 's' : ''}
                      </div>
                    )}
                    
                    {pkg.clientPackage?.expiresAt && (
                      <p className="mt-2 text-xs text-gray-500">
                        Expires: {format(new Date(pkg.clientPackage.expiresAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* No Packages Message */}
        {(!sessionPackages || sessionPackages.length === 0) && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6 text-center">
              <Package className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No Active Session Packages</h3>
              <p className="text-sm text-gray-600 mb-4">
                You don't have any active coaching session packages yet.
              </p>
              <Button 
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => window.open('https://outlook.office365.com/book/OmegaLongevity@omegalongevity.com/', '_blank')}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Book a Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>Your scheduled coaching sessions</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://outlook.office365.com/book/OmegaLongevity@omegalongevity.com/', '_blank')}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Book New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAppointments && upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.map((apt: any, index: number) => (
                  <div 
                    key={index} 
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {getAppointmentIcon(apt.appointmentType?.name)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {apt.appointmentType?.name || 'Coaching Session'}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatAppointmentDate(apt.appointment.startTime)}
                          </p>
                          {apt.appointment.notes && (
                            <p className="text-xs text-gray-500 mt-1">{apt.appointment.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(apt.appointment.status)}
                        {apt.appointmentType?.duration && (
                          <span className="text-xs text-gray-500">
                            {apt.appointmentType.duration} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming sessions scheduled</p>
                <Button 
                  variant="link" 
                  className="text-amber-600"
                  onClick={() => window.open('https://outlook.office365.com/book/OmegaLongevity@omegalongevity.com/', '_blank')}
                >
                  Book your next session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Session History
            </CardTitle>
            <CardDescription>Your completed coaching sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {pastAppointments && pastAppointments.length > 0 ? (
              <div className="space-y-2">
                {pastAppointments.slice(0, 10).map((apt: any, index: number) => (
                  <div 
                    key={index} 
                    className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {apt.appointmentType?.name || 'Coaching Session'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(apt.appointment.startTime), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(apt.appointment.status)}
                  </div>
                ))}
                
                {pastAppointments.length > 10 && (
                  <p className="text-center text-sm text-gray-500 pt-2">
                    Showing 10 of {pastAppointments.length} sessions
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No session history yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
