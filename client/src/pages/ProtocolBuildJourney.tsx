import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Play,
  CheckCircle2,
  Lock,
  CreditCard,
  FileText,
  Package,
  ExternalLink,
  Sparkles,
  Clock,
  ChevronRight,
  ArrowLeft,
  SkipForward,
  BookOpen,
  Target,
  Users,
  AlertCircle,
} from "lucide-react";

// TruDiagnostic link
const TRUDIAGNOSTIC_URL = "https://trudiagnostic.com/?ref=omegalong";

// PrivateMD Labs affiliate link
const PRIVATEMD_URL = "https://www.privatemdlabs.com/?a_aid=omegalong";

// Omega Elite Community link (GHL)
const OMEGA_ELITE_URL = "https://app.omegaelite.com";

// Google Drive folder with all masterclass videos
const MASTERCLASS_FOLDER_URL = "https://drive.google.com/drive/folders/1pSaA3lkTjTGVJEfSt0fBrI3w8et8H6ON";

export default function ProtocolBuildJourney() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("masterclass");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  
  // No access code gate needed - users access via enrollment or direct link
  
  // Get user's enrollment and progress
  const { data: user } = trpc.auth.me.useQuery();
  const { data: enrollment, refetch: refetchEnrollment } = trpc.transformation.getMyEnrollment.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: videoSections } = trpc.transformation.getMasterclassVideos.useQuery();
  const { data: videoProgress } = trpc.transformation.getVideoProgress.useQuery(
    { enrollmentId: enrollment?.id || 0 },
    { enabled: !!user && !!enrollment?.id }
  );
  
  // Mutations
  const updateEnrollment = trpc.transformation.updateEnrollmentJourneyStep.useMutation({
    onSuccess: () => {
      refetchEnrollment();
      toast.success("Progress updated!");
    },
  });
  
  // Calculate video completion progress
  const calculateVideoProgress = () => {
    if (!videoProgress || !videoSections) return 0;
    const totalVideos = videoSections.length;
    const watchedVideos = videoProgress.filter((p: any) => p.completed).length;
    return totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;
  };

  // Check if bioregulator video is watched
  const isBioregulatorWatched = enrollment?.bioregulatorVideoWatched || false;

  // Handle video watch - open in new tab
  const handleWatchVideo = (video: any) => {
    // Check if this is the bioregulator video (required)
    const isBioregulatorVideo = video.title?.toLowerCase().includes("anti-aging") || 
                                video.title?.toLowerCase().includes("bioregulator") ||
                                video.sectionNumber === 4;
    
    if (isBioregulatorVideo) {
      setSelectedVideo(video);
      setShowVideoDialog(true);
    }
    
    // Open video in new tab (YouTube preferred)
    if (video.youtubeVideoId) {
      window.open(`https://www.youtube.com/watch?v=${video.youtubeVideoId}`, '_blank');
    } else if (video.googleDriveVideoId) {
      window.open(`https://drive.google.com/file/d/${video.googleDriveVideoId}/view`, '_blank');
    } else if (video.googleDriveFolderId) {
      window.open(`https://drive.google.com/drive/folders/${video.googleDriveFolderId}`, '_blank');
    } else {
      window.open(MASTERCLASS_FOLDER_URL, '_blank');
    }
  };

  // Mark bioregulator video as watched
  const handleBioregulatorComplete = async () => {
    if (enrollment) {
      await updateEnrollment.mutateAsync({
        enrollmentId: enrollment.id,
        step: "bioregulatorVideoWatched",
        value: true,
      });
      setShowVideoDialog(false);
      toast.success("Great job! You've completed the required bioregulator video.");
    }
  };
  
  // Skip masterclass (for users who already know the content)
  const handleSkipMasterclass = () => {
    setActiveTab("resources");
    toast.info("Skipped to resources. You can always return to the masterclass.");
  };

  // Check if video is watched
  const isVideoWatched = (videoId: number) => {
    return videoProgress?.some((p: any) => p.videoId === videoId && p.completed);
  };

  // Check if video is required (bioregulator)
  const isRequiredVideo = (video: any) => {
    return video.title?.toLowerCase().includes("anti-aging") || 
           video.title?.toLowerCase().includes("bioregulator") ||
           video.sectionNumber === 4;
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="container max-w-6xl py-3 md:py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 md:h-10" />
              <span className="text-sm text-gray-500 hidden md:inline">Protocol Build Program</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setLocation("/protocol-build")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-gray-50 border-b border-gray-100 py-4">
        <div className="container max-w-6xl px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your Progress</span>
            <span className="text-sm text-gray-500">{calculateVideoProgress()}% Complete</span>
          </div>
          <Progress value={calculateVideoProgress()} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl px-4 py-8">
        {/* Bioregulator Requirement Notice */}
        {!isBioregulatorWatched && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium">Required: Watch the Bioregulator Video</p>
              <p className="text-amber-700 text-sm mt-1">
                Before accessing the protocol builder, you must complete the Anti-Aging & Bioregulators video (Section 4).
              </p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100">
            <TabsTrigger value="masterclass" className="data-[state=active]:bg-white">
              <Play className="h-4 w-4 mr-2" />
              Masterclass
            </TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-white">
              <BookOpen className="h-4 w-4 mr-2" />
              Resources
            </TabsTrigger>
            <TabsTrigger 
              value="protocol" 
              className="data-[state=active]:bg-white"
              disabled={!isBioregulatorWatched}
            >
              <Target className="h-4 w-4 mr-2" />
              Protocol Builder
              {!isBioregulatorWatched && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
          </TabsList>

          {/* Masterclass Tab */}
          <TabsContent value="masterclass" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Masterclass Video Library</h2>
                <p className="text-gray-600 mt-1">Complete education on peptides, bioregulators, and optimization</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSkipMasterclass}>
                <SkipForward className="h-4 w-4 mr-2" />
                Skip to Resources
              </Button>
            </div>

            {/* Video Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoSections?.map((video: any) => {
                const watched = isVideoWatched(video.id);
                const required = isRequiredVideo(video);
                
                return (
                  <Card 
                    key={video.id} 
                    className={`border ${required ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'} hover:shadow-md transition-shadow`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            watched ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {watched ? <CheckCircle2 className="h-4 w-4" /> : (video.sectionNumber && video.sectionNumber > 0 ? video.sectionNumber : <Play className="h-4 w-4" />)}
                          </div>
                          {required && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {(video.estimatedDurationMinutes && video.estimatedDurationMinutes > 0) && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {video.estimatedDurationMinutes} min
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base mt-2 text-gray-900">{video.title}</CardTitle>
                      {video.description && (
                        <CardDescription className="text-sm text-gray-600 line-clamp-2">
                          {video.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button
                        className={`w-full ${
                          required && !watched
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : watched
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        onClick={() => handleWatchVideo(video)}
                      >
                        {watched ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Watch Again
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Watch
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Resources & Tools</h2>
              <p className="text-gray-600 mt-1">Everything you need to build and execute your protocol</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Testing Resources */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Lab Testing
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Get baseline labs before starting your protocol
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => window.open(TRUDIAGNOSTIC_URL, '_blank')}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      TruDiagnostic - Biological Age Testing
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => window.open(PRIVATEMD_URL, '_blank')}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      PrivateMD Labs - Blood Work
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Community Access */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Users className="h-5 w-5 text-green-600" />
                    Omega Elite Community
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Connect with others on their optimization journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => window.open(OMEGA_ELITE_URL, '_blank')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Access Community
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    3 months FREE access included with your program
                  </p>
                </CardContent>
              </Card>

              {/* Reconstitution Guide */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Package className="h-5 w-5 text-amber-600" />
                    Reconstitution Guide
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Learn how to properly prepare your peptides
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      // Find the reconstitution video in masterclass
                      const reconVideo = videoSections?.find((v: any) => 
                        v.title?.toLowerCase().includes('reconstitution') ||
                        v.title?.toLowerCase().includes('preparation')
                      );
                      if (reconVideo) {
                        handleWatchVideo(reconVideo);
                      } else {
                        window.open(MASTERCLASS_FOLDER_URL, '_blank');
                      }
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Watch Reconstitution Video
                  </Button>
                </CardContent>
              </Card>

              {/* Supplier Resources */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Package className="h-5 w-5 text-purple-600" />
                    Sourcing & Suppliers
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Trusted sources for peptides and supplies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Supplier information is available in the masterclass videos and community resources.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => window.open(OMEGA_ELITE_URL, '_blank')}
                  >
                    View Supplier List in Community
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Protocol Builder Tab */}
          <TabsContent value="protocol" className="space-y-6">
            {!isBioregulatorWatched ? (
              <Card className="border border-amber-200 bg-amber-50">
                <CardContent className="py-12 text-center">
                  <Lock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Protocol Builder Locked</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Complete the required Anti-Aging & Bioregulators video (Section 4) in the Masterclass tab to unlock the protocol builder.
                  </p>
                  <Button
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => setActiveTab("masterclass")}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Go to Masterclass
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Protocol Builder</h2>
                <p className="text-gray-600 mb-6">Design your personalized peptide protocol based on your goals</p>
                
                <Card className="border border-gray-200">
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Protocol Builder Coming Soon</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      The interactive protocol builder is being developed. In the meantime, use the resources and community to plan your protocol.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        className="border-gray-200"
                        onClick={() => setActiveTab("resources")}
                      >
                        View Resources
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => window.open(OMEGA_ELITE_URL, '_blank')}
                      >
                        Ask in Community
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bioregulator Video Completion Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Mark Video as Complete?</DialogTitle>
            <DialogDescription className="text-gray-600">
              Have you finished watching the {selectedVideo?.title} video? This is required to unlock the Protocol Builder.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowVideoDialog(false)}
            >
              Not Yet
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleBioregulatorComplete}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-8 bg-gray-50 border-t border-gray-100 mt-12">
        <div className="container max-w-6xl px-4 text-center">
          <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Want coaching support?{" "}
            <a href="/transformation" className="text-amber-600 hover:text-amber-700">
              Upgrade to the 90-Day Transformation Program
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
