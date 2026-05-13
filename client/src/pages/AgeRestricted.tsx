import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, ArrowLeft, Mail, AlertTriangle } from "lucide-react";

export default function AgeRestricted() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
      <Card className="max-w-lg w-full bg-slate-800 border-slate-700 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/20 rounded-full">
              <ShieldX className="h-12 w-12 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Age Restriction Notice</CardTitle>
          <CardDescription className="text-slate-400 text-base mt-2">
            Access to this website is restricted to adults 18 years of age and older.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-300">
                <p className="font-medium text-amber-400 mb-2">Why is there an age restriction?</p>
                <p className="mb-3">
                  Omega Longevity provides information and services related to health optimization, peptides, and supplements. This content is intended for adults who can make informed decisions about their health and wellness.
                </p>
                <p>
                  The information on our platform is educational in nature and should be reviewed in consultation with qualified healthcare professionals. We take the safety and well-being of our visitors seriously.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-slate-400 text-sm">
              If you believe you reached this page in error, or if you are 18 years of age or older, you may return to our website.
            </p>
            
            <Button
              onClick={() => window.location.href = "/"}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:from-amber-500 hover:to-orange-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Website
            </Button>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <p className="text-center text-slate-400 text-sm mb-4">
              Have questions? We're here to help.
            </p>
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => window.location.href = "mailto:omega@omegalongevity.com"}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Us
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            By using our website, you agree to our{" "}
            <a href="/terms" className="text-orange-400 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-orange-400 hover:underline">Privacy Policy</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
