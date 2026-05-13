import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { getClientsTransformed, getYearsExperience } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, ArrowRight, Lock, Users, Star, Award, BookOpen, Clock, CheckCircle2, ChevronDown, ChevronUp, Sparkles, GraduationCap, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";

// Section labels for grouping
const SECTION_LABELS: Record<number, string> = {
  0: "Getting Started",
  1: "Foundation",
  2: "Expert Insights",
  3: "Weight Management",
  4: "Anti-Aging & Longevity",
  5: "Anti-Aging & Longevity",
  6: "Recovery & Healing",
  7: "Cellular Health",
  8: "Immune & Mental Health",
  10: "Hormones & Wellness",
  11: "Sexual Health",
  12: "Skin & Appearance",
  13: "Metabolic Health",
  14: "Bonus Content",
  15: "Client Testimonials",
};

export default function Masterclass() {
  const [, setLocation] = useLocation();
  const masterclassEmail = sessionStorage.getItem("masterclassEmail");
  const masterclassName = sessionStorage.getItem("masterclassName");
  
  // If no email in session, redirect to transformation page
  useEffect(() => {
    if (!masterclassEmail) {
      setLocation("/transformation");
    }
  }, [masterclassEmail, setLocation]);
  
  // Fetch masterclass videos
  const { data: videos, isLoading } = trpc.transformation.getMasterclassVideos.useQuery();
  
  const [expandedVideo, setExpandedVideo] = useState<number | null>(null);
  
  // Build ordered flat list with sequential numbering
  const orderedVideos = videos?.filter((v: any) => v.youtubeVideoId || v.googleDriveVideoId) || [];
  
  // Group videos into logical sections for display
  const groupedSections: { label: string; videos: any[] }[] = [];
  let currentLabel = "";
  
  orderedVideos.forEach((video: any) => {
    const sectionNum = video.sectionNumber ?? 0;
    const label = SECTION_LABELS[sectionNum] || "Additional Content";
    
    if (label !== currentLabel) {
      groupedSections.push({ label, videos: [] });
      currentLabel = label;
    }
    groupedSections[groupedSections.length - 1].videos.push(video);
  });
  
  // Calculate total duration
  const totalMinutes = orderedVideos.reduce((sum: number, v: any) => sum + (v.estimatedDurationMinutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  
  // Global sequential index
  let globalIndex = 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="container max-w-7xl py-3 md:py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3" style={{ background: 'transparent' }}>
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 md:h-10" style={{ background: 'transparent', maxWidth: '200px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-blue-300 hover:text-white hover:bg-white/10"
                onClick={() => setLocation("/transformation")}
              >
                Back
              </Button>
              <Button 
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
                onClick={() => setLocation("/transformation/select-tier")}
              >
                Explore Coaching Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container max-w-4xl px-4 relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-full mb-6">
              <Play className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-wide uppercase">Free Peptide Masterclass</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Clarity in a World of<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Peptide Confusion</span>
            </h1>
            
            <p className="text-lg text-blue-200/70 max-w-2xl mx-auto mb-6">
              Welcome{masterclassName ? <>, <span className="text-white font-medium">{masterclassName}</span></> : <>, <span className="text-white font-medium">{masterclassEmail}</span></>}. Your masterclass is ready below. 
              Watch at your own pace — each module builds on the last.
            </p>
            
            {/* Stats bar */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-blue-300/60 mb-8">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400/60" />
                <span><span className="text-white font-semibold">{getClientsTransformed()}+</span> have watched</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400/60" />
                <span><span className="text-white font-semibold">4.9/5</span> rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400/60" />
                <span><span className="text-white font-semibold">{orderedVideos.length} modules</span> · {totalHours}h {remainingMinutes}m total</span>
              </div>
            </div>
            
            {/* Disclaimer */}
            <div className="bg-blue-900/30 border border-blue-500/20 rounded-lg px-4 py-3 max-w-2xl mx-auto">
              <p className="text-blue-300/70 text-xs leading-relaxed">
                <span className="text-amber-400/80 font-medium">Note:</span> This masterclass was originally produced for a men's health optimization community. The peptide science, protocols, and dosing guidance apply universally regardless of gender. Your personalized coaching program will be tailored specifically to your individual goals and health profile.
              </p>
            </div>
          </div>
          
          {/* Video Modules */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-blue-200/60">Loading your masterclass...</p>
            </div>
          ) : orderedVideos.length > 0 ? (
            <div className="space-y-8">
              {groupedSections.map((section, sectionIdx) => (
                <div key={sectionIdx}>
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      {section.label === "Client Testimonials" ? (
                        <MessageCircle className="h-4 w-4 text-amber-400" />
                      ) : section.label === "Bonus Content" ? (
                        <Sparkles className="h-4 w-4 text-amber-400" />
                      ) : (
                        <GraduationCap className="h-4 w-4 text-amber-400" />
                      )}
                      <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">{section.label}</h2>
                    </div>
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-blue-300/40">{section.videos.length} {section.videos.length === 1 ? 'video' : 'videos'}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {section.videos.map((video: any) => {
                      globalIndex++;
                      const currentIndex = globalIndex;
                      const isExpanded = expandedVideo === video.id;
                      const videoUrl = video.youtubeVideoId 
                        ? `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}?rel=0&modestbranding=1`
                        : video.googleDriveVideoId 
                          ? `https://drive.google.com/file/d/${video.googleDriveVideoId}/preview`
                          : null;
                      
                      return (
                        <Card 
                          key={video.id}
                          className={`border transition-all duration-300 overflow-hidden ${
                            isExpanded 
                              ? "border-amber-500/50 bg-slate-800/80 shadow-lg shadow-amber-500/10" 
                              : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"
                          }`}
                        >
                          <button 
                            className="w-full text-left"
                            onClick={() => setExpandedVideo(isExpanded ? null : video.id)}
                          >
                            <CardHeader className="py-4 px-5">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isExpanded ? "bg-amber-500 text-white" : "bg-white/10 text-blue-300"
                                }`}>
                                  {isExpanded ? (
                                    <Play className="h-5 w-5" />
                                  ) : (
                                    <span className="text-sm font-bold">{currentIndex}</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-base text-white font-semibold truncate">
                                    {video.title}
                                  </CardTitle>
                                  {video.description && (
                                    <p className="text-sm text-blue-200/50 mt-0.5 truncate">{video.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {video.estimatedDurationMinutes && (
                                    <span className="text-xs text-blue-300/50 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {video.estimatedDurationMinutes} min
                                    </span>
                                  )}
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-amber-400" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-blue-300/40" />
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                          </button>
                          
                          {isExpanded && (
                            <CardContent className="pt-0 pb-5 px-5">
                              {videoUrl ? (
                                <div className="rounded-xl overflow-hidden shadow-inner bg-black" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                                  <iframe
                                    src={videoUrl}
                                    frameBorder="0"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                    title={video.title}
                                  />
                                </div>
                              ) : (
                                <div className="bg-slate-700/50 rounded-xl p-8 text-center">
                                  <Lock className="h-8 w-8 text-blue-300/40 mx-auto mb-3" />
                                  <p className="text-blue-200/60 text-sm">Video coming soon — check back shortly!</p>
                                </div>
                              )}
                              
                              {/* Watch on YouTube link */}
                              {video.youtubeVideoId && (
                                <div className="mt-3 flex justify-end">
                                  <a 
                                    href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-300/40 hover:text-blue-300/70 flex items-center gap-1 transition-colors"
                                  >
                                    <Play className="h-3 w-3" />
                                    Watch on YouTube
                                  </a>
                                </div>
                              )}
                              
                              {video.chapters && (
                                <div className="mt-4 bg-white/5 rounded-lg p-4">
                                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    Chapters
                                  </p>
                                  <p className="text-sm text-blue-200/60 whitespace-pre-line">{video.chapters}</p>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Play className="h-10 w-10 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Masterclass Coming Soon</h3>
              <p className="text-blue-200/60 max-w-md mx-auto">
                The masterclass modules are being finalized. You'll receive an email at <span className="text-white">{masterclassEmail}</span> when they're ready.
              </p>
            </div>
          )}
          
          {/* CTA to coaching */}
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-3">
                Ready for Personalized Coaching?
              </h3>
              <p className="text-blue-200/70 max-w-xl mx-auto mb-6">
                The masterclass gives you the knowledge. Coaching gives you the personalized protocol, 
                accountability, and expert guidance to transform your health.
              </p>
              <Button 
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-lg px-8 py-5 rounded-xl shadow-lg shadow-amber-500/25"
                onClick={() => setLocation("/transformation/select-tier")}
              >
                Explore All Coaching Plans
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-blue-300/50">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400/60" />
                  <span>Plans from $2,500</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400/60" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400/60" />
                  <span>1-on-1 with Jason</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="container max-w-6xl px-4 text-center">
          <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 mx-auto mb-4" />
          <p className="text-blue-300/40 text-sm mb-2">
            Questions? Email us at{" "}
            <a href="mailto:omega@omegalongevity.com" className="text-amber-400/60 hover:text-amber-400">
              omega@omegalongevity.com
            </a>
          </p>
          <p className="text-blue-300/30 text-sm">
            © {new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
