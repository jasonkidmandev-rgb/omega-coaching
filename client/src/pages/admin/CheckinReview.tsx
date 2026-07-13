import { useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, AlertTriangle, Clock, MessageSquare, Video, Mic, 
  ArrowLeft, Send, Play, Pause, Upload, User, Calendar, TrendingUp, FileDown
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Link, useParams, useLocation } from "wouter";
import { goBackTo } from "@/hooks/useGoBack";
import { toast } from "sonner";

export default function CheckinReview() {
  
  const params = useParams<{ clientId: string; checkinId: string }>();
  const [, setLocation] = useLocation();
  const clientProtocolId = parseInt(params.clientId || "0");
  const checkinId = parseInt(params.checkinId || "0");
  
  const [responseType, setResponseType] = useState<'text' | 'voice' | 'video'>('text');
  const [textResponse, setTextResponse] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedMedia, setRecordedMedia] = useState<{ url: string; blob: Blob } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Fetch check-in details
  const { data: checkin, isLoading, refetch } = trpc.checkin.get.useQuery({ id: checkinId });
  
  // Fetch client trends
  const { data: trends } = trpc.checkin.getTrends.useQuery({ 
    clientProtocolId, 
    weeks: 12 
  });
  
  // Mutations
  const exportPdfMutation = trpc.checkin.exportPdf.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    },
    onError: (error) => {
      toast.error(`Failed to export PDF: ${error.message}`);
    }
  });

  const markReviewedMutation = trpc.checkin.markReviewed.useMutation({
    onSuccess: () => {
      toast.success("Your response has been saved and the client will be notified");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const uploadMediaMutation = trpc.checkin.uploadMedia.useMutation();
  
  const addCoachResponseMutation = trpc.checkin.addCoachResponse.useMutation({
    onError: (error) => {
      toast.error(`Failed to save response: ${error.message}`);
    }
  });
  
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
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: responseType === 'video'
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: responseType === 'video' ? 'video/webm' : 'audio/webm' 
        });
        const url = URL.createObjectURL(blob);
        setRecordedMedia({ url, blob });
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Could not access microphone/camera");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleSubmitReview = async () => {
    try {
      let mediaUrl: string | undefined;
      
      if (recordedMedia && (responseType === 'voice' || responseType === 'video')) {
        // Upload media first
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(recordedMedia.blob);
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        
        const result = await uploadMediaMutation.mutateAsync({
          base64Data: base64,
          fileName: `response-${checkinId}.${responseType === 'video' ? 'webm' : 'webm'}`,
          contentType: responseType === 'video' ? 'video/webm' : 'audio/webm',
        });
        mediaUrl = result.url;
      }
      
      // Save coach response (text and/or media) to the database
      if (textResponse.trim() || mediaUrl) {
        await addCoachResponseMutation.mutateAsync({
          checkinId,
          responseType,
          textContent: textResponse.trim() || undefined,
          mediaUrl,
        });
      }
      
      // Mark the check-in as reviewed
      markReviewedMutation.mutate({
        id: checkinId,
      });
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!checkin) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Check-in not found</h2>
        <p className="text-muted-foreground">This check-in may have been deleted or doesn't exist.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation(params.clientId ? `/admin/clients/${params.clientId}` : '/admin/checkins')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Client
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => goBackTo(`/admin/clients/${params.clientId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Client
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Check-in Review</h1>
          <p className="text-muted-foreground">
            {(checkin as any).clientName || `Client #${clientProtocolId}`} • {checkin.sentAt ? format(new Date(checkin.sentAt), 'MMMM d, yyyy') : 'N/A'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportPdfMutation.mutate({ checkinId })}
            disabled={exportPdfMutation.isPending}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {exportPdfMutation.isPending ? 'Exporting...' : 'Export PDF'}
          </Button>
          {checkin.status === 'reviewed' ? (
            <Badge variant="secondary" className="bg-green-500/20 text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Reviewed
            </Badge>
          ) : checkin.status === 'submitted' ? (
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">
              <Clock className="h-3 w-3 mr-1" />
              Awaiting Review
            </Badge>
          ) : (
            <Badge variant="outline">{checkin.status}</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Responses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Score Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${getScoreBg(checkin.overallScore)}`}>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(checkin.overallScore)}`}>
                    {checkin.overallScore ?? 'N/A'}/10
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${getScoreBg(checkin.lowestScore)}`}>
                  <p className="text-sm text-muted-foreground">Lowest Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(checkin.lowestScore)}`}>
                    {checkin.lowestScore ?? 'N/A'}/10
                  </p>
                  {checkin.hasLowScore && (
                    <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Needs attention
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responses */}
          <Card>
            <CardHeader>
              <CardTitle>Client Responses</CardTitle>
              <CardDescription>
                Submitted {checkin.submittedAt ? formatDistanceToNow(new Date(checkin.submittedAt), { addSuffix: true }) : 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {checkin.responses && checkin.responses.length > 0 ? (
                checkin.responses.map((response: any, idx: number) => (
                  <div key={response.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <Label className="text-base font-medium">
                        {idx + 1}. {response.questionText}
                      </Label>
                      {response.questionType === 'scale' && response.scaleValue !== null && (
                        <Badge 
                          variant="outline" 
                          className={`${
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
                              className={`h-full rounded-full ${
                                (response.scaleValue ?? 0) <= 5 ? 'bg-red-500' :
                                (response.scaleValue ?? 0) <= 7 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${((response.scaleValue ?? 0) / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : response.questionType === 'checkbox' ? (
                        <p className={response.booleanValue ? 'text-green-600' : 'text-muted-foreground'}>
                          {response.booleanValue ? '✓ Yes' : '✗ No'}
                        </p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">
                          {response.textValue || <span className="text-muted-foreground italic">No response</span>}
                        </p>
                      )}
                    </div>
                    {idx < checkin.responses.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No responses recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Coach Response Section */}
          {checkin.status === 'submitted' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Your Response
                </CardTitle>
                <CardDescription>
                  Add feedback for the client (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Response Type Selector */}
                <div className="flex gap-2">
                  <Button 
                    variant={responseType === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResponseType('text')}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Text
                  </Button>
                  <Button 
                    variant={responseType === 'voice' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResponseType('voice')}
                  >
                    <Mic className="h-4 w-4 mr-1" />
                    Voice
                  </Button>
                  <Button 
                    variant={responseType === 'video' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResponseType('video')}
                  >
                    <Video className="h-4 w-4 mr-1" />
                    Video
                  </Button>
                </div>

                {/* Text Response */}
                {responseType === 'text' && (
                  <div className="space-y-2">
                    {/* Response Templates Dropdown */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Quick Templates:</Label>
                      <select
                        className="text-sm border rounded px-2 py-1 bg-background"
                        onChange={(e) => {
                          if (e.target.value) {
                            const clientName = 'there'; // Client name not available in checkin data
                            const template = e.target.value.replace('{name}', clientName);
                            setTextResponse(prev => prev ? prev + '\n\n' + template : template);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Insert template...</option>
                        <option value="Great job this week, {name}! Your consistency is really paying off. Keep up the excellent work!">Great Progress</option>
                        <option value="{name}, I noticed some areas we should discuss. Let's schedule a quick call to review your protocol and make any needed adjustments.">Needs Attention</option>
                        <option value="{name}, I can see you're putting in the effort! Remember, progress isn't always linear. Stay consistent and trust the process.">Encouragement</option>
                        <option value="Excellent check-in, {name}! Your scores are trending in the right direction. Let's keep this momentum going!">Positive Trend</option>
                        <option value="{name}, thank you for being honest in your check-in. Let's work together to address the challenges you're facing.">Supportive</option>
                        <option value="{name}, I'd like to make some adjustments to your protocol based on this week's feedback. I'll send over the updated version shortly.">Protocol Adjustment</option>
                        <option value="Great to see your progress, {name}! Make sure you're staying hydrated and getting enough rest. See you next week!">General Wellness</option>
                      </select>
                    </div>
                    <Textarea 
                      placeholder="Write your feedback here..."
                      value={textResponse}
                      onChange={(e) => setTextResponse(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                {/* Voice/Video Recording */}
                {(responseType === 'voice' || responseType === 'video') && (
                  <div className="space-y-4">
                    {recordedMedia ? (
                      <div className="space-y-2">
                        {responseType === 'video' ? (
                          <video src={recordedMedia.url} controls className="w-full rounded-lg" />
                        ) : (
                          <audio src={recordedMedia.url} controls className="w-full" />
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setRecordedMedia(null)}
                        >
                          Record Again
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg">
                        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                          isRecording ? 'bg-red-500 animate-pulse' : 'bg-muted'
                        }`}>
                          {responseType === 'video' ? (
                            <Video className={`h-8 w-8 ${isRecording ? 'text-white' : ''}`} />
                          ) : (
                            <Mic className={`h-8 w-8 ${isRecording ? 'text-white' : ''}`} />
                          )}
                        </div>
                        <Button
                          variant={isRecording ? 'destructive' : 'default'}
                          onClick={isRecording ? stopRecording : startRecording}
                        >
                          {isRecording ? 'Stop Recording' : `Start ${responseType === 'video' ? 'Video' : 'Voice'} Recording`}
                        </Button>
                      </div>
                    )}
                    
                    {/* Optional text note with media */}
                    <div className="space-y-2">
                      <Label>Additional text note (optional)</Label>
                      <Textarea 
                        placeholder="Add a text note along with your recording..."
                        value={textResponse}
                        onChange={(e) => setTextResponse(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      markReviewedMutation.mutate({ id: checkinId });
                    }}
                    disabled={markReviewedMutation.isPending}
                  >
                    Mark as Reviewed (No Response)
                  </Button>
                  <Button 
                    onClick={handleSubmitReview}
                    disabled={markReviewedMutation.isPending || uploadMediaMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {markReviewedMutation.isPending || uploadMediaMutation.isPending ? 'Sending...' : 'Send Response & Mark Reviewed'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous Coach Response */}
          {checkin.coachResponse && (
            <Card>
              <CardHeader>
                <CardTitle>Coach Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[checkin.coachResponse].map((response: any) => (
                  <div key={response.id} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{response.responseType}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {response.createdAt ? format(new Date(response.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </span>
                    </div>
                    {response.textContent && (
                      <p className="text-sm whitespace-pre-wrap">{response.textContent}</p>
                    )}
                    {response.mediaUrl && response.responseType === 'video' && (
                      <video src={response.mediaUrl} controls className="w-full rounded-lg mt-2" />
                    )}
                    {response.mediaUrl && response.responseType === 'voice' && (
                      <audio src={response.mediaUrl} controls className="w-full mt-2" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Client Info & Trends */}
        <div className="space-y-6">
          {/* Client Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Protocol ID</p>
                <p className="font-medium">#{clientProtocolId}</p>
              </div>
              <Separator />
              <Link href={`/admin/clients/${clientProtocolId}`}>
                <Button variant="outline" className="w-full">
                  View Full Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Trends Summary */}
          {trends && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Trends
                </CardTitle>
                <CardDescription>Last 12 weeks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{trends.totalCheckins}</p>
                    <p className="text-xs text-muted-foreground">Check-ins</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className={`text-2xl font-bold ${getScoreColor(trends.averageScore)}`}>
                      {trends.averageScore ?? 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>

                {/* Score Trend Line Chart */}
                {trends.trends.length > 1 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Score Over Time</p>
                      <div style={{ width: '100%', height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={trends.trends.map((t, i) => ({
                              week: `Wk ${i + 1}`,
                              date: t.date ? format(new Date(t.date), 'M/d') : `Wk ${i + 1}`,
                              score: t.overallScore,
                              lowest: t.lowestScore,
                            }))}
                            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                          >
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              domain={[0, 10]}
                              ticks={[0, 2, 4, 6, 8, 10]}
                              tick={{ fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{ fontSize: 12, borderRadius: 8 }}
                              formatter={(value: number, name: string) => [
                                `${value}/10`,
                                name === 'score' ? 'Overall' : 'Lowest'
                              ]}
                            />
                            <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#22c55e"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#22c55e' }}
                              activeDot={{ r: 5 }}
                              name="score"
                            />
                            <Line
                              type="monotone"
                              dataKey="lowest"
                              stroke="#f59e0b"
                              strokeWidth={1.5}
                              strokeDasharray="4 2"
                              dot={{ r: 2, fill: '#f59e0b' }}
                              activeDot={{ r: 4 }}
                              name="lowest"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-green-500 rounded" />
                          <span className="text-[10px] text-muted-foreground">Overall</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-yellow-500 rounded" style={{ borderTop: '1px dashed' }} />
                          <span className="text-[10px] text-muted-foreground">Lowest</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-red-500 rounded opacity-40" style={{ borderTop: '1px dashed' }} />
                          <span className="text-[10px] text-muted-foreground">Alert (5)</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Photos Taken</span>
                    <Badge variant="outline">{trends.trends.filter(t => t.tookPhotos).length} / {trends.totalCheckins}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Metrics Updated</span>
                    <Badge variant="outline">{trends.trends.filter(t => t.updatedMetrics).length} / {trends.totalCheckins}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}