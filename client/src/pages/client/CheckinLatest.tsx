import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Clock, Calendar, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function CheckinLatest() {
  const [, setLocation] = useLocation();
  
  // Get pending check-ins for the logged-in client
  const { data: pendingCheckins, isLoading: loadingPending } = trpc.checkin.getClientPending.useQuery();
  const { data: checkinHistory, isLoading: loadingHistory } = trpc.checkin.getClientHistoryAuth.useQuery({ limit: 5 });
  
  const isLoading = loadingPending || loadingHistory;
  const hasPendingCheckins = pendingCheckins && pendingCheckins.length > 0;
  const hasHistory = checkinHistory && checkinHistory.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/dashboard')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Weekly Check-Ins</h1>
          <p className="text-slate-400">Track your progress and stay connected with your coach</p>
        </div>

        {/* Pending Check-ins */}
        {hasPendingCheckins ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Check-Ins
            </h2>
            {pendingCheckins.map((checkin: any) => (
              <Card key={checkin.id} className="bg-white border-gray-200 hover:border-amber-500 transition-colors cursor-pointer"
                onClick={() => setLocation(`/checkin/${checkin.id}`)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/20 rounded-full">
                        <FileText className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">Weekly Check-In</h3>
                        <p className="text-sm text-slate-400">
                          Due: {format(new Date(checkin.dueAt), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      Pending
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State - No Pending Check-ins */
          <Card className="bg-white border-gray-200">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-green-500/20 rounded-full">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">All Caught Up!</h2>
                <p className="text-slate-400 max-w-md">
                  You don't have any pending check-ins right now. Your next check-in will be available soon.
                </p>
                <div className="flex items-center gap-2 text-slate-500 mt-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Check back on your scheduled check-in day</span>
                </div>
                <Button 
                  onClick={() => setLocation('/dashboard')}
                  className="mt-4 bg-orange-500 hover:bg-orange-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Check-in History */}
        {hasHistory && (
          <div className="space-y-4 mt-8">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Recent Check-Ins
            </h2>
            {checkinHistory.map((checkin: any) => (
              <Card key={checkin.id} className="bg-white border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => setLocation(`/checkin/${checkin.id}/view`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {format(new Date(checkin.submittedAt), 'MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-slate-400">
                          Score: {checkin.overallScore}/10
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-400 border-green-500/30">
                      Completed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No History Message */}
        {!hasHistory && !hasPendingCheckins && (
          <Card className="bg-white border-gray-200 mt-4">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <AlertCircle className="h-5 w-5" />
                <p>No check-in history yet. Complete your first check-in to start tracking your progress!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
