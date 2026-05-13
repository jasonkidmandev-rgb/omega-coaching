import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { toast } from "sonner";
import {
  FileText,
  ShoppingBag,
  MessageSquare,
  Calendar,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
  CloudSun,
  Package,
  Pill,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Play,
  BookOpen,
  Users,
  Loader2,
  Target,
  Award,
  Zap,
  Camera,
  FileEdit,
  Plus,
  Image,
  X,
  Smile,
  Meh,
  Frown,
  Battery,
  BedDouble,
  Upload,
  Trash2,
  Columns,
  ArrowLeftRight,
  Heart,
  ClipboardCheck,
  FolderOpen,
  Scale,
  ArrowLeft,
  Gift,
  FileCheck,
  Crown,
} from "lucide-react";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { QuickStats } from "@/components/QuickStats";
import { FullPageLoader } from "@/components/LoadingSpinner";
import { SkeletonDashboard } from "@/components/ui/skeleton";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function ClientDashboard() {
  const { user, loading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Fetch client's protocols grouped by visibility
  const { data: myProtocols, isLoading: isProtocolLoading, refetch: refetchProtocols } = trpc.clientProtocol.getMyProtocols.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // Get the primary active protocol (most recent active one)
  const myProtocol = myProtocols?.active?.[0] || myProtocols?.options?.[0];
  
  // All active protocols for display
  const activeProtocols = myProtocols?.active || [];
  const optionProtocols = myProtocols?.options || [];
  const archivedProtocols = myProtocols?.archived || [];

  // Fetch protocol items
  const { data: protocolItemsData } = trpc.clientProtocol.getItems.useQuery(
    { clientProtocolId: myProtocol?.id || 0 },
    { enabled: !!myProtocol?.id }
  );

  // Fetch comments for the protocol
  const { data: comments = [] } = trpc.comments.list.useQuery(
    { clientProtocolId: myProtocol?.id || 0 },
    { enabled: !!myProtocol?.id }
  );

  // Progress tracking state
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoCategory, setPhotoCategory] = useState<'before' | 'progress' | 'after' | 'other'>('progress');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteMood, setNoteMood] = useState<'great' | 'good' | 'okay' | 'struggling' | 'difficult' | undefined>();
  const [noteEnergy, setNoteEnergy] = useState<number | undefined>();
  const [noteSleep, setNoteSleep] = useState<number | undefined>();
  
  // Comparison feature state
  const [showComparison, setShowComparison] = useState(false);
  const [beforePhoto, setBeforePhoto] = useState<any>(null);
  const [afterPhoto, setAfterPhoto] = useState<any>(null);

  // Fetch favorite peptides
  const { data: favoritePeptides = [] } = trpc.peptide.getFavorites.useQuery(undefined, {
    enabled: !!user,
  });

  // Progress tracking queries
  const { data: progressPhotos = [], refetch: refetchPhotos } = trpc.progress.getPhotos.useQuery(
    { clientProtocolId: myProtocol?.id },
    { enabled: !!user }
  );
  const { data: journeyNotes = [], refetch: refetchNotes } = trpc.progress.getNotes.useQuery(
    { clientProtocolId: myProtocol?.id },
    { enabled: !!user }
  );

  // Progress tracking mutations
  const uploadPhotoMutation = trpc.progress.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success('Photo uploaded successfully!');
      setShowPhotoUpload(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setPhotoCaption('');
      refetchPhotos();
    },
    onError: (error) => {
      toast.error(`Failed to upload photo: ${error.message}`);
    },
  });

  const deletePhotoMutation = trpc.progress.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success('Photo deleted');
      refetchPhotos();
    },
  });

  const createNoteMutation = trpc.progress.createNote.useMutation({
    onSuccess: () => {
      toast.success('Note saved!');
      setShowNoteForm(false);
      setNoteContent('');
      setNoteTitle('');
      setNoteMood(undefined);
      setNoteEnergy(undefined);
      setNoteSleep(undefined);
      refetchNotes();
    },
    onError: (error) => {
      toast.error(`Failed to save note: ${error.message}`);
    },
  });

  const deleteNoteMutation = trpc.progress.deleteNote.useMutation({
    onSuccess: () => {
      toast.success('Note deleted');
      refetchNotes();
    },
  });

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async () => {
    if (!selectedFile) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadPhotoMutation.mutate({
        imageData: base64,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        caption: photoCaption || undefined,
        category: photoCategory,
        clientProtocolId: myProtocol?.id,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  // Handle note save
  const handleNoteSave = () => {
    if (!noteContent.trim()) return;
    createNoteMutation.mutate({
      title: noteTitle || undefined,
      content: noteContent,
      mood: noteMood,
      energyLevel: noteEnergy,
      sleepQuality: noteSleep,
      clientProtocolId: myProtocol?.id,
    });
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    await Promise.all([
      refetchProtocols(),
      refetchPhotos(),
      refetchNotes(),
    ]);
    toast.success('Dashboard refreshed!', { duration: 2000 });
  };

  // Heartbeat - update lastSeenAt for "last seen" indicator
  const heartbeatMutation = trpc.inbox.heartbeat.useMutation();
  useEffect(() => {
    if (!user) return;
    heartbeatMutation.mutate();
    const interval = setInterval(() => { heartbeatMutation.mutate(); }, 120000);
    return () => clearInterval(interval);
  }, [user]);

  // Show welcome toast on first visit
  useEffect(() => {
    if (user && !hasSeenWelcome) {
      const welcomeKey = `dashboard_welcome_${user.id}`;
      const hasSeenBefore = localStorage.getItem(welcomeKey);
      if (!hasSeenBefore) {
        toast.success(
          `Welcome to your dashboard, ${user.name?.split(' ')[0] || 'there'}!`,
          {
            duration: 4000,
            icon: '👋',
          }
        );
        localStorage.setItem(welcomeKey, 'true');
      }
      setHasSeenWelcome(true);
    }
  }, [user, hasSeenWelcome]);

  if (isAuthLoading || isProtocolLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  // Check if user came from a protocol page (via referrer or URL params)
  const referrer = document.referrer;
  const protocolMatch = referrer.match(/\/protocol\/([a-zA-Z0-9]+)/);
  const protocolToken = protocolMatch ? protocolMatch[1] : null;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border-gray-200">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Sign In Required</CardTitle>
            <CardDescription className="text-slate-400">
              Please sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => window.location.href = getLoginUrl('/dashboard')}
            >
              Sign In
            </Button>
            {protocolToken && (
              <Button 
                variant="outline"
                className="w-full border-gray-300 text-gray-600 hover:bg-gray-100"
                onClick={() => setLocation(`/protocol/${protocolToken}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My Protocol
              </Button>
            )}
            {!protocolToken && (
              <Button 
                variant="ghost"
                className="w-full text-slate-400 hover:text-gray-600"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats from protocol
  const protocolItems = protocolItemsData || [];
  const includedItems = protocolItems.filter((item: any) => item.isIncluded);
  const peptideCount = includedItems.filter((item: any) => item.itemType === 'peptide').length;
  const supplementCount = includedItems.filter((item: any) => item.itemType === 'supplement').length;
  const totalCost = includedItems.reduce((sum: number, item: any) => {
    const price = parseFloat(item.customPrice || item.price || '0');
    const qty = item.quantity || 1;
    return sum + (price * qty);
  }, 0);

  // Count unread coach comments
  const unreadComments = comments.filter(
    (c: any) => c.authorType === 'coach' && !c.isRead
  ).length;

  // Quick links for the dashboard
  const quickLinks = [
    {
      title: "View My Protocol",
      description: "See your personalized health protocol",
      icon: FileText,
      href: myProtocol?.accessToken ? `/protocol/${myProtocol.accessToken}` : null,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      badge: myProtocol?.status === 'pending_approval' ? 'Pending Review' : null,
    },

    {
      title: "Messages",
      description: "Chat with your coach",
      icon: MessageSquare,
      href: myProtocol?.accessToken ? `/protocol/${myProtocol.accessToken}#comments` : null,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      badge: unreadComments > 0 ? `${unreadComments} New` : null,
    },
    {
      title: "Launchpad",
      description: "Access all your resources",
      icon: Sparkles,
      href: "/launchpad",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  // Client Corner links
  const clientCornerLinks = [
    {
      title: "Weekly Check-Ins",
      description: "Submit your weekly progress check-in",
      icon: ClipboardCheck,
      href: "/checkin/latest",
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      title: "My Documents",
      description: "Access labs, reports, and resources",
      icon: FolderOpen,
      href: "/documents",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      title: "My Inventory",
      description: "Track your supplement inventory",
      icon: Package,
      href: "/inventory",
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "My Metrics",
      description: "Track weight, body fat, and progress",
      icon: Scale,
      href: "/metrics",
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
    {
      title: "Chat with Coach",
      description: "Message your coach directly",
      icon: MessageSquare,
      href: myProtocol?.accessToken ? `/protocol/${myProtocol.accessToken}#comments` : null,
      noProtocolMessage: "You don't have an active protocol yet. Your coach will create one for you soon!",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Peptide Cheat Sheet",
      description: "Quick reference guide for protocols",
      icon: BookOpen,
      href: "/peptide-cheat-sheet",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },

  ];

  // Resources section
  const resources = [
    {
      title: "Omega Elite Community",
      description: "Join the community for support and tips",
      icon: Users,
      href: "https://omegaelite.com",
      external: true,
    },
    {
      title: "PeptidePro App",
      description: "Track your daily protocol",
      icon: Calendar,
      href: "https://peptidepro.app",
      external: true,
    },
    {
      title: "Educational Resources",
      description: "Learn about peptides and supplements",
      icon: BookOpen,
      href: "/peptide-cheat-sheet",
      external: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo - Navy Background */}
      <header className="border-b border-gray-200 bg-[#1e3a5f] sticky top-0 z-40">
        <div className="container max-w-6xl py-3 px-4">
          <div className="flex items-center justify-between">
            <a href="https://peptidecoach.pro" className="bg-white rounded-lg px-3 py-1.5 inline-block">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-6 md:h-8" />
            </a>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-amber-400 text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500"
              onClick={() => setLocation("/launchpad")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Launchpad</span>
            </Button>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Push Notification Opt-In Banner */}
        <PushNotificationBanner />
        {/* Welcome Message */}
        <WelcomeMessage 
          name={user.name || "Client"} 
          coachName="your Omega coach"
          className="mb-6"
        />

        {/* Push Notification Opt-In Banner */}
        <PushNotificationBanner />

        {/* Get Started Section - Show when user has no protocol */}
        {!myProtocol && (
          <Card className="mb-8 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Welcome to Omega Longevity!</CardTitle>
                  <CardDescription className="text-gray-600">
                    Start your health optimization journey today
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                You don't have an active protocol yet. Here are some ways to get started:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coaching Programs CTA */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-white border-amber-300 hover:bg-amber-50 hover:border-amber-400 justify-start group transition-all"
                  onClick={() => setLocation('/transformation')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg group-hover:from-amber-200 group-hover:to-orange-200 transition-all">
                      <Target className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">Choose a Coaching Tier</p>
                      <p className="text-xs text-gray-500">Elite • Flagship • Essentials programs</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>

                {/* Masterclasses CTA */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-white border-blue-300 hover:bg-blue-50 hover:border-blue-400 justify-start group transition-all"
                  onClick={() => setLocation('/masterclass')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg group-hover:from-blue-200 group-hover:to-indigo-200 transition-all">
                      <Play className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">Watch Masterclasses</p>
                      <p className="text-xs text-gray-500">Learn about peptides & protocols</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>

                {/* 90-Day Program CTA */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-white border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 justify-start group transition-all"
                  onClick={() => setLocation('/transformation?tier=flagship')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg group-hover:from-emerald-200 group-hover:to-green-200 transition-all">
                      <Award className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">Start a 90-Day Program</p>
                      <p className="text-xs text-gray-500">Structured transformation journey</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>

                {/* Omega Elite CTA */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-white border-purple-300 hover:bg-purple-50 hover:border-purple-400 justify-start group transition-all"
                  onClick={() => window.open('https://omegaelite.com', '_blank')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg group-hover:from-purple-200 group-hover:to-violet-200 transition-all">
                      <Crown className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">Join Omega Elite</p>
                      <p className="text-xs text-gray-500">DIY learners • Ask questions • Get guidance</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-purple-500" />
                  </div>
                </Button>
              </div>

              <div className="mt-4 p-4 bg-white/60 rounded-lg border border-amber-200">
                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Not sure where to start?</strong> Join Omega Elite to connect with our community and get personalized recommendations for your health goals.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {myProtocol && (
          <QuickStats
            totalItems={includedItems.length}
            durationMonths={myProtocol.durationMonths || 12}
            totalCost={totalCost}
            peptideCount={peptideCount}
            supplementCount={supplementCount}
            showCost={true}
            className="mb-8"
          />
        )}

        {/* Quick Actions - Urgent Items */}
        {myProtocol && (
          <Card className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-gray-600">
                Items that need your attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pending Check-In Action */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-blue-50 border-blue-200 hover:bg-blue-100 justify-start"
                  onClick={() => setLocation('/checkin/latest')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ClipboardCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Weekly Check-In</p>
                      <p className="text-xs text-gray-500">Submit your progress update</p>
                    </div>
                  </div>
                </Button>

                {/* View Documents Action */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-purple-50 border-purple-200 hover:bg-purple-100 justify-start"
                  onClick={() => setLocation('/documents')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FolderOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">My Documents</p>
                      <p className="text-xs text-gray-500">View uploaded files & labs</p>
                    </div>
                  </div>
                </Button>

                {/* View Inventory Action */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-green-50 border-green-200 hover:bg-green-100 justify-start"
                  onClick={() => setLocation('/inventory')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Package className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">My Inventory</p>
                      <p className="text-xs text-gray-500">Track supplies & reorder</p>
                    </div>
                  </div>
                </Button>

                {/* View Metrics Action */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-amber-50 border-amber-200 hover:bg-amber-100 justify-start"
                  onClick={() => setLocation('/metrics')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Scale className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">My Metrics</p>
                      <p className="text-xs text-gray-500">View health measurements</p>
                    </div>
                  </div>
                </Button>

                {/* Referral Program Action */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 justify-start"
                  onClick={() => setLocation('/referrals')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Gift className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Referral Program</p>
                      <p className="text-xs text-gray-500">Earn rewards by referring friends</p>
                    </div>
                  </div>
                </Button>

                {/* Coaching Sessions Action */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 justify-start"
                  onClick={() => setLocation('/sessions')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Coaching Sessions</p>
                      <p className="text-xs text-gray-500">View & book your sessions</p>
                    </div>
                  </div>
                </Button>
                {/* Progress Photos Action */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 bg-pink-50 border-pink-200 hover:bg-pink-100 justify-start"
                  onClick={() => {
                    const el = document.getElementById('progress-tracking');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else setShowPhotoUpload(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Camera className="h-5 w-5 text-pink-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Progress Photos</p>
                      <p className="text-xs text-gray-500">Upload & track your transformation</p>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Protocols Section */}
        {(activeProtocols.length > 0 || optionProtocols.length > 0) && (
          <Card className="mb-8 bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                My Protocols
              </CardTitle>
              <CardDescription className="text-gray-600">
                {optionProtocols.length > 0 
                  ? "Review and compare your protocol options" 
                  : "Your active health protocols"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Options to Compare */}
              {optionProtocols.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-amber-600 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Options to Review
                  </h4>
                  <div className="grid gap-3">
                    {optionProtocols.map((protocol: any) => (
                      <div
                        key={protocol.id}
                        className="p-4 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer"
                        onClick={() => setLocation(`/protocol/${protocol.accessToken}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <FileText className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {protocol.versionName || protocol.clientName || 'Protocol Option'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Created {new Date(protocol.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-500 text-white">Option</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Protocols */}
              {activeProtocols.length > 0 && (
                <div className="mb-6">
                  {optionProtocols.length > 0 && (
                    <h4 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Active Protocols
                    </h4>
                  )}
                  <div className="grid gap-3">
                    {activeProtocols.map((protocol: any) => (
                      <div
                        key={protocol.id}
                        className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 hover:border-green-400 transition-all cursor-pointer"
                        onClick={() => setLocation(`/protocol/${protocol.accessToken}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {protocol.versionName || protocol.clientName || 'My Protocol'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {protocol.status === 'pending_approval' ? 'Pending Review' : 
                                 protocol.status === 'approved' ? 'Approved' :
                                 protocol.status === 'active' ? 'Active' : 
                                 protocol.status === 'completed' ? 'Completed' : 'Draft'}
                                {' · '}
                                Started {new Date(protocol.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archived Protocols (collapsed) */}
              {archivedProtocols.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2 py-2">
                    <FolderOpen className="h-4 w-4" />
                    Previous Protocols ({archivedProtocols.length})
                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-3 grid gap-2">
                    {archivedProtocols.map((protocol: any) => (
                      <div
                        key={protocol.id}
                        className="p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer"
                        onClick={() => setLocation(`/protocol/${protocol.accessToken}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {protocol.versionName || protocol.clientName || 'Archived Protocol'}
                              </p>
                              <p className="text-xs text-gray-400">
                                Archived {protocol.archivedAt ? new Date(protocol.archivedAt).toLocaleDateString() : ''}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-gray-500 border-gray-300">Archived</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
         )}

        {/* Progress Tracking Section */}
        <Card id="progress-tracking" className="mb-8 bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-purple-500" />
                  My Progress Journey
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Track your transformation with photos and notes
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowPhotoUpload(true)}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Add Photo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowNoteForm(true)}
                >
                  <FileEdit className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="photos" className="w-full">
              <TabsList className="bg-gray-100 mb-4">
                <TabsTrigger value="photos" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                  <Image className="h-4 w-4 mr-1" />
                  Photos ({progressPhotos.length})
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                  <FileEdit className="h-4 w-4 mr-1" />
                  Notes ({journeyNotes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="photos">
                {progressPhotos.length === 0 ? (
                  <div className="text-center py-8">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No progress photos yet</p>
                    <p className="text-sm text-gray-500">Upload before/after photos to track your transformation</p>
                    <Button
                      className="mt-4 bg-purple-500 hover:bg-purple-600"
                      onClick={() => setShowPhotoUpload(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload First Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Comparison Button */}
                    {progressPhotos.filter((p: any) => p.category === 'before').length > 0 && 
                     progressPhotos.filter((p: any) => p.category === 'after' || p.category === 'progress').length > 0 && (
                      <Button
                        variant="outline"
                        className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
                        onClick={() => {
                          const beforePhotos = progressPhotos.filter((p: any) => p.category === 'before');
                          const afterPhotos = progressPhotos.filter((p: any) => p.category === 'after' || p.category === 'progress');
                          setBeforePhoto(beforePhotos[0]);
                          setAfterPhoto(afterPhotos[afterPhotos.length - 1]);
                          setShowComparison(true);
                        }}
                      >
                        <Columns className="h-4 w-4 mr-2" />
                        View Before & After Comparison
                      </Button>
                    )}
                    
                    {/* Photo Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {progressPhotos.slice(0, 8).map((photo: any) => (
                        <div key={photo.id} className="relative group cursor-pointer" onClick={() => {
                          if (photo.category === 'before') {
                            setBeforePhoto(photo);
                            toast.info('Before photo selected for comparison');
                          } else {
                            setAfterPhoto(photo);
                            toast.info('After photo selected for comparison');
                          }
                        }}>
                          <img
                            src={photo.imageUrl}
                            alt={photo.caption || 'Progress photo'}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2">
                            <Badge className={`self-start text-xs ${
                              photo.category === 'before' ? 'bg-blue-500' : 
                              photo.category === 'after' ? 'bg-green-500' : 'bg-purple-500'
                            }`}>
                              {photo.category}
                            </Badge>
                            <div className="flex justify-between items-end">
                              <span className="text-xs text-white">
                                {new Date(photo.createdAt).toLocaleDateString()}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this photo?')) {
                                    deletePhotoMutation.mutate({ id: photo.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {photo.caption && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes">
                {journeyNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileEdit className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No journal entries yet</p>
                    <p className="text-sm text-gray-500">Document your journey with notes about how you're feeling</p>
                    <Button
                      className="mt-4 bg-purple-500 hover:bg-purple-600"
                      onClick={() => setShowNoteForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Write First Note
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {journeyNotes.slice(0, 5).map((note: any) => (
                      <div key={note.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {note.mood && (
                              <span className="text-lg">
                                {note.mood === 'great' ? '\u{1F604}' :
                                 note.mood === 'good' ? '\u{1F642}' :
                                 note.mood === 'okay' ? '\u{1F610}' :
                                 note.mood === 'struggling' ? '\u{1F614}' : '\u{1F622}'}
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              {new Date(note.noteDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {note.energyLevel && (
                              <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">
                                <Battery className="h-3 w-3 mr-1" />
                                {note.energyLevel}/10
                              </Badge>
                            )}
                            {note.sleepQuality && (
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                                <BedDouble className="h-3 w-3 mr-1" />
                                {note.sleepQuality}/10
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-500 hover:text-red-600"
                              onClick={() => {
                                if (confirm('Delete this note?')) {
                                  deleteNoteMutation.mutate({ id: note.id });
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {note.title && (
                          <h4 className="font-medium text-gray-900 mb-1">{note.title}</h4>
                        )}
                        <p className="text-sm text-gray-700">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* My Progress Tracker */}
        {myProtocol && includedItems.length > 0 && (
          <Card className="mb-8 bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                My Progress
              </CardTitle>
              <CardDescription className="text-gray-600">
                Track your protocol journey and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress Overview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Overall Progress</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round((myProtocol.status === 'completed' ? 100 : 
                      myProtocol.status === 'active' ? 50 : 
                      myProtocol.status === 'approved' ? 25 : 10))}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${myProtocol.status === 'completed' ? 100 : 
                      myProtocol.status === 'active' ? 50 : 
                      myProtocol.status === 'approved' ? 25 : 10}%` }}
                  />
                </div>
              </div>

              {/* Milestones */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg ${myProtocol.status !== 'draft' ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {myProtocol.status !== 'draft' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">Protocol Created</span>
                  </div>
                  <p className="text-xs text-gray-500">Your personalized protocol</p>
                </div>

                <div className={`p-4 rounded-lg ${['approved', 'active', 'completed'].includes(myProtocol.status) ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {['approved', 'active', 'completed'].includes(myProtocol.status) ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">Approved</span>
                  </div>
                  <p className="text-xs text-gray-500">Reviewed and confirmed</p>
                </div>

                <div className={`p-4 rounded-lg ${['active', 'completed'].includes(myProtocol.status) ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {['active', 'completed'].includes(myProtocol.status) ? (
                      <Zap className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">Active</span>
                  </div>
                  <p className="text-xs text-gray-500">Protocol in progress</p>
                </div>

                <div className={`p-4 rounded-lg ${myProtocol.status === 'completed' ? 'bg-amber-50 border border-amber-200' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {myProtocol.status === 'completed' ? (
                      <Award className="h-5 w-5 text-amber-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">Completed</span>
                  </div>
                  <p className="text-xs text-gray-500">Journey complete!</p>
                </div>
              </div>

              {/* Item Breakdown */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Protocol Items</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Pill className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{peptideCount}</p>
                      <p className="text-xs text-gray-500">Peptides</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Package className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{supplementCount}</p>
                      <p className="text-xs text-gray-500">Supplements</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Protocol Status Banner */}
        {myProtocol && (
          <Card className="mb-8 bg-[#1e3a5f] border-[#1e3a5f]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    myProtocol.status === 'active' ? 'bg-green-500/20' :
                    myProtocol.status === 'approved' ? 'bg-blue-500/20' :
                    'bg-amber-500/20'
                  }`}>
                    {myProtocol.status === 'active' ? (
                      <Play className="h-6 w-6 text-green-400" />
                    ) : myProtocol.status === 'approved' ? (
                      <CheckCircle className="h-6 w-6 text-blue-400" />
                    ) : (
                      <Clock className="h-6 w-6 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {myProtocol.status === 'active' ? 'Protocol Active' :
                       myProtocol.status === 'approved' ? 'Protocol Approved' :
                       myProtocol.status === 'pending_approval' ? 'Awaiting Your Approval' :
                       'Protocol Status'}
                    </h3>
                    <p className="text-sm text-white/70">
                      {myProtocol.status === 'pending_approval' 
                        ? 'Review and approve your protocol to get started'
                        : `${myProtocol.durationMonths || 12} month program`}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => myProtocol.accessToken && setLocation(`/protocol/${myProtocol.accessToken}`)}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {myProtocol.status === 'pending_approval' ? 'Review Protocol' : 'View Protocol'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickLinks.map((link) => (
            <Card 
              key={link.title}
              className={`bg-white border-gray-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer ${!link.href ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
              if (link.href) {
                setLocation(link.href);
              } else if (link.title === 'View My Protocol' || link.title === 'Messages') {
                // Show helpful message when no protocol exists
                alert('You don\'t have an active protocol yet. Your coach will create one for you soon!');
              }
            }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${link.bg}`}>
                    <link.icon className={`h-5 w-5 ${link.color}`} />
                  </div>
                  {link.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {link.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{link.title}</h3>
                <p className="text-sm text-gray-500">{link.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Client Corner Section */}
        <Card className="mb-8 bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Client Corner
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your personal health tracking hub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientCornerLinks.map((link: any) => (
                <div
                  key={link.title}
                  className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer border border-gray-200 hover:border-amber-300"
                  onClick={() => {
                    if (link.external) {
                      window.open(link.href, '_blank');
                    } else if (link.href) {
                      setLocation(link.href);
                    } else if (link.noProtocolMessage) {
                      alert(link.noProtocolMessage);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${link.bg}`}>
                      <link.icon className={`h-5 w-5 ${link.color}`} />
                    </div>
                    <span className="font-medium text-gray-900">{link.title}</span>
                    {link.external && <ExternalLink className="h-3 w-3 text-gray-400" />}
                  </div>
                  <p className="text-sm text-gray-500 ml-11">{link.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resources Section */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              Resources & Tools
            </CardTitle>
            <CardDescription className="text-slate-400">
              Helpful resources to support your health journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resources.map((resource) => (
                <div
                  key={resource.title}
                  className="p-4 rounded-lg bg-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    if (resource.external) {
                      window.open(resource.href, '_blank');
                    } else {
                      setLocation(resource.href);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <resource.icon className="h-5 w-5 text-amber-500" />
                    <h4 className="font-medium text-white">{resource.title}</h4>
                    {resource.external && (
                      <ExternalLink className="h-3 w-3 text-slate-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{resource.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Favorite Peptides */}
        {favoritePeptides.length > 0 && (
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500 fill-current" />
                  My Favorite Peptides
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-500 hover:text-orange-400"
                  onClick={() => setLocation('/peptide-cheat-sheet')}
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <CardDescription className="text-slate-400">
                Quick access to your saved peptides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {favoritePeptides.slice(0, 6).map((fav: any) => (
                  <div
                    key={fav.id}
                    className="p-4 rounded-lg bg-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-white mb-1">{fav.peptide?.name}</h4>
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {fav.peptide?.description || 'No description'}
                        </p>
                      </div>
                      <Heart className="h-4 w-4 text-pink-500 fill-current flex-shrink-0 ml-2" />
                    </div>
                    {(fav.peptide?.dosage || fav.peptide?.frequency) && (
                      <div className="mt-3 pt-3 border-t border-gray-300/50">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {fav.peptide?.dosage && (
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded">
                              {fav.peptide.dosage}
                            </span>
                          )}
                          {fav.peptide?.frequency && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                              {fav.peptide.frequency}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {favoritePeptides.length > 6 && (
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-slate-400 hover:text-white"
                  onClick={() => setLocation('/peptide-cheat-sheet')}
                >
                  View All {favoritePeptides.length} Favorites
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {comments.length > 0 && (
          <Card className="mt-8 bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                Recent Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comments.slice(0, 3).map((comment: any) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-lg bg-gray-100 flex items-start gap-3"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      comment.authorType === 'coach' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                    }`}>
                      <span className={`text-sm font-medium ${
                        comment.authorType === 'coach' ? 'text-amber-500' : 'text-blue-500'
                      }`}>
                        {comment.authorName?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">
                          {comment.authorName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        {comment.authorType === 'coach' && !comment.isRead && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate">
                        {comment.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {comments.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-slate-400 hover:text-white"
                  onClick={() => myProtocol?.accessToken && setLocation(`/protocol/${myProtocol.accessToken}#comments`)}
                >
                  View All Messages
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Photo Upload Dialog */}
      <Dialog open={showPhotoUpload} onOpenChange={setShowPhotoUpload}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Progress Photo</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a photo to track your transformation journey
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Preview" className="w-full rounded-lg" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <Upload className="h-10 w-10 text-slate-500 mb-2" />
                <span className="text-sm text-slate-400">Click to upload or drag and drop</span>
                <span className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            )}
            <div>
              <Label className="text-gray-600">Category</Label>
              <div className="flex gap-2 mt-2">
                {(['before', 'progress', 'after'] as const).map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={photoCategory === cat ? 'default' : 'outline'}
                    className={photoCategory === cat ? 'bg-purple-500' : 'border-gray-300'}
                    onClick={() => setPhotoCategory(cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-gray-600">Caption (optional)</Label>
              <Input
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Add a caption..."
                className="mt-2 bg-gray-100 border-gray-300 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhotoUpload(false)} className="border-gray-300">
              Cancel
            </Button>
            <Button
              onClick={handlePhotoUpload}
              disabled={!selectedFile || uploadPhotoMutation.isPending}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {uploadPhotoMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Photo</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Form Dialog */}
      <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
        <DialogContent className="bg-white border-gray-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Add Journal Entry</DialogTitle>
            <DialogDescription className="text-slate-400">
              Document how you're feeling on your health journey
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-600">Title (optional)</Label>
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g., Week 2 Check-in"
                className="mt-2 bg-gray-100 border-gray-300 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-600">How are you feeling?</Label>
              <div className="flex gap-2 mt-2">
                {(['great', 'good', 'okay', 'struggling', 'difficult'] as const).map((mood) => (
                  <Button
                    key={mood}
                    size="sm"
                    variant={noteMood === mood ? 'default' : 'outline'}
                    className={noteMood === mood ? 'bg-purple-500' : 'border-gray-300'}
                    onClick={() => setNoteMood(mood)}
                  >
                    {mood === 'great' ? '😄' :
                     mood === 'good' ? '🙂' :
                     mood === 'okay' ? '😐' :
                     mood === 'struggling' ? '😔' : '😢'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Energy Level (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={noteEnergy || ''}
                  onChange={(e) => setNoteEnergy(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1-10"
                  className="mt-2 bg-gray-100 border-gray-300 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-600">Sleep Quality (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={noteSleep || ''}
                  onChange={(e) => setNoteSleep(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1-10"
                  className="mt-2 bg-gray-100 border-gray-300 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-600">Your Notes</Label>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="How are you feeling? Any changes you've noticed? Challenges or wins?"
                className="mt-2 bg-gray-100 border-gray-300 text-white min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteForm(false)} className="border-gray-300">
              Cancel
            </Button>
            <Button
              onClick={handleNoteSave}
              disabled={!noteContent.trim() || createNoteMutation.isPending}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {createNoteMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Save Entry</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Before & After Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="bg-white border-gray-200 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-purple-500" />
              Before & After Comparison
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              See your transformation side by side
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Before Photo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-500">Before</Badge>
                {beforePhoto && (
                  <span className="text-xs text-slate-400">
                    {new Date(beforePhoto.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {beforePhoto ? (
                <div className="relative">
                  <img
                    src={beforePhoto.imageUrl}
                    alt="Before"
                    className="w-full aspect-[3/4] object-cover rounded-lg"
                  />
                  {beforePhoto.caption && (
                    <p className="text-sm text-slate-400 mt-2">{beforePhoto.caption}</p>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-slate-500">No before photo selected</p>
                </div>
              )}
              {/* Photo selector */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {progressPhotos.filter((p: any) => p.category === 'before').map((photo: any) => (
                  <img
                    key={photo.id}
                    src={photo.imageUrl}
                    alt="Before option"
                    className={`w-12 h-12 object-cover rounded cursor-pointer border-2 ${
                      beforePhoto?.id === photo.id ? 'border-blue-500' : 'border-transparent'
                    }`}
                    onClick={() => setBeforePhoto(photo)}
                  />
                ))}
              </div>
            </div>

            {/* After Photo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-green-500">After / Progress</Badge>
                {afterPhoto && (
                  <span className="text-xs text-slate-400">
                    {new Date(afterPhoto.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {afterPhoto ? (
                <div className="relative">
                  <img
                    src={afterPhoto.imageUrl}
                    alt="After"
                    className="w-full aspect-[3/4] object-cover rounded-lg"
                  />
                  {afterPhoto.caption && (
                    <p className="text-sm text-slate-400 mt-2">{afterPhoto.caption}</p>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-slate-500">No after photo selected</p>
                </div>
              )}
              {/* Photo selector */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {progressPhotos.filter((p: any) => p.category === 'after' || p.category === 'progress').map((photo: any) => (
                  <img
                    key={photo.id}
                    src={photo.imageUrl}
                    alt="After option"
                    className={`w-12 h-12 object-cover rounded cursor-pointer border-2 ${
                      afterPhoto?.id === photo.id ? 'border-green-500' : 'border-transparent'
                    }`}
                    onClick={() => setAfterPhoto(photo)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Time difference */}
          {beforePhoto && afterPhoto && (
            <div className="text-center py-3 bg-gray-100 rounded-lg">
              <p className="text-slate-400 text-sm">
                <span className="text-purple-400 font-medium">
                  {Math.round((new Date(afterPhoto.createdAt).getTime() - new Date(beforePhoto.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                </span>
                {' '}days of progress
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </PullToRefresh>
    </div>
  );
}
