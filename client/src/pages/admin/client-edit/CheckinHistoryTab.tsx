import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mic,
  Video,
  FileText,
  Calendar,
  Star,
  TrendingUp,
} from "lucide-react";

interface CheckinHistoryTabProps {
  clientProtocolId: number;
}

export default function CheckinHistoryTab({ clientProtocolId }: CheckinHistoryTabProps) {
  const [expandedCheckins, setExpandedCheckins] = useState<Set<number>>(new Set());

  const { data: history, isLoading } = trpc.checkin.getClientCheckinHistory.useQuery(
    { clientProtocolId },
    { enabled: !!clientProtocolId }
  );

  const toggleExpanded = (id: number) => {
    setExpandedCheckins(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (history) {
      setExpandedCheckins(new Set(history.map((c: any) => c.id)));
    }
  };

  const collapseAll = () => {
    setExpandedCheckins(new Set());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reviewed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><ClipboardCheck className="h-3 w-3 mr-1" />Awaiting Review</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'incomplete':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />Incomplete</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score <= 5) return "text-red-500";
    if (score <= 7) return "text-yellow-500";
    return "text-green-500";
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return "bg-muted";
    if (score <= 5) return "bg-red-500/10";
    if (score <= 7) return "bg-yellow-500/10";
    return "bg-green-500/10";
  };

  const getBarColor = (score: number | null) => {
    if (score === null || score === undefined) return "bg-muted";
    if (score <= 5) return "bg-red-500";
    if (score <= 7) return "bg-yellow-500";
    return "bg-green-500";
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Denver',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold text-muted-foreground">No Check-ins Yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Check-in history will appear here once the client submits their first check-in.
        </p>
      </div>
    );
  }

  const reviewedCount = history.filter((c: any) => c.status === 'reviewed').length;
  const submittedCount = history.filter((c: any) => c.status === 'submitted').length;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-500" />
            Check-in History
          </h3>
          <Badge variant="outline" className="text-xs">
            {history.length} total
          </Badge>
          {reviewedCount > 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
              {reviewedCount} reviewed
            </Badge>
          )}
          {submittedCount > 0 && (
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">
              {submittedCount} awaiting review
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
            Collapse All
          </Button>
        </div>
      </div>

      {/* Check-in Timeline */}
      <div className="space-y-3">
        {history.map((checkin: any) => {
          const isExpanded = expandedCheckins.has(checkin.id);
          const responses = checkin.responses || [];
          const coachResponse = checkin.coachResponse;

          return (
            <Card
              key={checkin.id}
              className={`transition-all cursor-pointer ${
                isExpanded ? 'ring-1 ring-orange-500/30' : 'hover:bg-muted/30'
              }`}
            >
              {/* Collapsed Header - Always Visible */}
              <div
                className="flex items-center justify-between p-4"
                onClick={() => toggleExpanded(checkin.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {checkin.weekNumber ? `Week ${checkin.weekNumber}` : 'Check-in'}
                      </span>
                      {getStatusBadge(checkin.status)}
                      {coachResponse && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Coach Feedback
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {checkin.submittedAt ? formatDate(checkin.submittedAt) : formatDate(checkin.sentAt)}
                      </span>
                      {checkin.overallScore !== null && (
                        <span className={`flex items-center gap-1 font-medium ${getScoreColor(checkin.overallScore)}`}>
                          <Star className="h-3 w-3" />
                          Score: {checkin.overallScore}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {checkin.overallScore !== null && (
                  <div className={`text-2xl font-bold ${getScoreColor(checkin.overallScore)} ${getScoreBg(checkin.overallScore)} rounded-lg px-3 py-1`}>
                    {checkin.overallScore}
                  </div>
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4 border-t">
                  <div className="space-y-4 mt-4">
                    {/* Score Summary - matching CheckinReview style */}
                    {(checkin.overallScore !== null || checkin.lowestScore !== null) && (
                      <Card>
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Score Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded-lg ${getScoreBg(checkin.overallScore)}`}>
                              <p className="text-xs text-muted-foreground">Overall Score</p>
                              <p className={`text-2xl font-bold ${getScoreColor(checkin.overallScore)}`}>
                                {checkin.overallScore ?? 'N/A'}/10
                              </p>
                            </div>
                            <div className={`p-3 rounded-lg ${getScoreBg(checkin.lowestScore)}`}>
                              <p className="text-xs text-muted-foreground">Lowest Score</p>
                              <p className={`text-2xl font-bold ${getScoreColor(checkin.lowestScore)}`}>
                                {checkin.lowestScore ?? 'N/A'}/10
                              </p>
                              {checkin.hasLowScore && (
                                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                                  <AlertTriangle className="h-3 w-3" />
                                  Needs attention
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Client Responses - matching CheckinReview style */}
                    {responses.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-sm">Client Responses</CardTitle>
                          <CardDescription className="text-xs">
                            {checkin.submittedAt
                              ? `Submitted ${formatDate(checkin.submittedAt)}`
                              : 'Pending submission'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-4">
                          {responses.map((response: any, idx: number) => (
                            <div key={response.id || idx} className="space-y-1.5 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                              <div className="flex items-start justify-between">
                                <Label className="text-sm font-medium">
                                  {idx + 1}. {response.questionText || `Question ${idx + 1}`}
                                </Label>
                                {response.questionType === 'scale' && response.scaleValue !== null && (
                                  <Badge
                                    variant="outline"
                                    className={`ml-2 shrink-0 ${
                                      response.scaleValue <= 5 ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                      response.scaleValue <= 7 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                                      'bg-green-500/10 text-green-600 border-green-500/20'
                                    }`}
                                  >
                                    {response.scaleValue}/10
                                  </Badge>
                                )}
                              </div>
                              <div className="pl-4 border-l-2 border-muted">
                                {response.questionType === 'scale' ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${getBarColor(response.scaleValue)}`}
                                        style={{ width: `${((response.scaleValue ?? 0) / 10) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : response.questionType === 'checkbox' ? (
                                  <div className="flex items-center gap-1.5">
                                    {response.booleanValue ? (
                                      <><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-sm text-green-700">Yes</span></>
                                    ) : (
                                      <><XCircle className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-500">No</span></>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap">
                                    {response.textValue || <span className="text-muted-foreground italic">No response</span>}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Coach Feedback */}
                    {coachResponse ? (
                      <div className="border-l-4 border-purple-500 pl-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-purple-500" />
                          Coach Feedback
                          <span className="text-xs text-muted-foreground font-normal">
                            {coachResponse.createdAt ? formatDate(coachResponse.createdAt) : ''}
                          </span>
                        </h4>
                        {coachResponse.textContent && (
                          <div className="text-sm whitespace-pre-wrap bg-purple-50 rounded-lg p-3 mb-2">
                            <p className="text-sm whitespace-pre-wrap">{coachResponse.textContent}</p>
                          </div>
                        )}
                        {coachResponse.mediaUrl && (
                          <div className="flex items-center gap-2 text-sm">
                            {coachResponse.responseType === 'video' ? (
                              <>
                                <Video className="h-4 w-4 text-purple-500" />
                                <a href={coachResponse.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                                  View video response
                                </a>
                              </>
                            ) : coachResponse.responseType === 'voice' ? (
                              <>
                                <Mic className="h-4 w-4 text-purple-500" />
                                <audio controls src={coachResponse.mediaUrl} className="h-8" />
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : checkin.status === 'submitted' ? (
                      <div className="border-l-4 border-blue-300 pl-4">
                        <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Awaiting coach review
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/admin/clients/${clientProtocolId}/checkins/${checkin.id}`;
                          }}
                        >
                          Review Now
                        </Button>
                      </div>
                    ) : checkin.status === 'reviewed' ? (
                      <div className="border-l-4 border-gray-300 pl-4">
                        <p className="text-sm text-muted-foreground italic">
                          Reviewed (no written feedback recorded)
                        </p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
