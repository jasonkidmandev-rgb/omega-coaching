import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  Smartphone,
  Apple,
  Chrome,
  Share,
  Plus,
  Download,
  MoreVertical,
  ArrowLeft,
  CheckCircle,
  Bell,
  Wifi,
  Sparkles,
} from "lucide-react";

export default function InstallApp() {
  const [, setLocation] = useLocation();
  const [detectedOS, setDetectedOS] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect user's device
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDetectedOS('ios');
    } else if (/android/.test(userAgent)) {
      setDetectedOS('android');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-4xl py-3 px-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-white"
              onClick={() => setLocation('/launchpad')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="bg-white rounded-lg px-3 py-1.5">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-6 md:h-8" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-orange-500/20 rounded-full mb-4">
            <Smartphone className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Install the Omega Longevity App
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Get instant access to your health protocol, check-ins, and more right from your phone's home screen!
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="p-2 bg-green-500/20 rounded-full w-fit mx-auto mb-2">
                <Sparkles className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="text-white font-medium mb-1">Quick Access</h3>
              <p className="text-slate-400 text-sm">Launch directly from your home screen</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="p-2 bg-blue-500/20 rounded-full w-fit mx-auto mb-2">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-white font-medium mb-1">Push Notifications</h3>
              <p className="text-slate-400 text-sm">Get reminders for check-ins & updates</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="p-2 bg-purple-500/20 rounded-full w-fit mx-auto mb-2">
                <Wifi className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="text-white font-medium mb-1">Works Offline</h3>
              <p className="text-slate-400 text-sm">Access your info without internet</p>
            </CardContent>
          </Card>
        </div>

        {/* Installation Instructions Tabs */}
        <Tabs defaultValue={detectedOS === 'ios' ? 'iphone' : 'android'} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 mb-6">
            <TabsTrigger value="iphone" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Apple className="h-4 w-4 mr-2" />
              iPhone
            </TabsTrigger>
            <TabsTrigger value="android" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Chrome className="h-4 w-4 mr-2" />
              Android
            </TabsTrigger>
          </TabsList>

          {/* iPhone Instructions */}
          <TabsContent value="iphone">
            <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Image */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 flex items-center justify-center">
                    <img 
                      src="/iphone-install-guide.png" 
                      alt="iPhone Installation Guide" 
                      className="max-h-[500px] w-auto rounded-lg shadow-2xl"
                    />
                  </div>
                  
                  {/* Steps */}
                  <div className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <Apple className="h-6 w-6" />
                      Install on iPhone
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          1
                        </div>
                        <div>
                          <h3 className="text-white font-medium mb-1">Open Safari</h3>
                          <p className="text-slate-400 text-sm">
                            Navigate to <span className="text-orange-400 font-medium">peptidecoach.pro</span>
                          </p>
                          <p className="text-amber-500/80 text-xs mt-1">
                            ⚠️ Must use Safari - won't work in Chrome
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          2
                        </div>
                        <div>
                          <h3 className="text-white font-medium mb-1">Tap the Share Button</h3>
                          <p className="text-slate-400 text-sm">
                            Look for the <Share className="inline h-4 w-4" /> icon at the bottom of your screen
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          3
                        </div>
                        <div>
                          <h3 className="text-white font-medium mb-1">Add to Home Screen</h3>
                          <p className="text-slate-400 text-sm">
                            Scroll down and tap <span className="inline-flex items-center gap-1 text-white"><Plus className="h-3 w-3" /> Add to Home Screen</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium mb-1">Done!</h3>
                          <p className="text-slate-400 text-sm">
                            The app icon will appear on your home screen
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Android Instructions */}
          <TabsContent value="android">
            <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Image */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 flex items-center justify-center">
                    <img 
                      src="/android-install-guide.png" 
                      alt="Android Installation Guide" 
                      className="max-h-[500px] w-auto rounded-lg shadow-2xl"
                    />
                  </div>
                  
                  {/* Steps */}
                  <div className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <Chrome className="h-6 w-6 text-green-500" />
                      Install on Android
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          1
                        </div>
                        <div>
                          <h3 className="text-white font-medium mb-1">Open Chrome</h3>
                          <p className="text-slate-400 text-sm">
                            Navigate to <span className="text-orange-400 font-medium">peptidecoach.pro</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          2
                        </div>
                        <div>
                          <h3 className="text-white font-medium mb-1">Tap the Menu</h3>
                          <p className="text-slate-400 text-sm">
                            Look for the <MoreVertical className="inline h-4 w-4" /> three dots in the top right corner
                          </p>
                          <p className="text-green-500/80 text-xs mt-1">
                            💡 You may see an "Install App" prompt automatically!
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          3
                        </div>
                        <div>
                          <h3 className="text-white font-medium mb-1">Install App</h3>
                          <p className="text-slate-400 text-sm">
                            Tap <span className="inline-flex items-center gap-1 text-white"><Download className="h-3 w-3" /> Install app</span> or "Add to Home Screen"
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium mb-1">Done!</h3>
                          <p className="text-slate-400 text-sm">
                            The app icon will appear on your home screen
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* After Installing Section */}
        <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30 mt-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">After Installing</h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span><strong>Enable Notifications</strong> - Tap "Enable" when prompted to receive check-in reminders and protocol updates</span>
              </li>
              <li className="flex items-start gap-3">
                <Wifi className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span><strong>Works Offline</strong> - Access your information even without an internet connection</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span><strong>No App Store Needed</strong> - The app installs directly from your browser</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="text-center mt-8 text-slate-400">
          <p>Having trouble? Contact your Omega Longevity coach for assistance.</p>
        </div>
      </div>
    </div>
  );
}
