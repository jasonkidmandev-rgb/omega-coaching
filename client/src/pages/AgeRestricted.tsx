import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, ArrowLeft, Mail, AlertTriangle } from "lucide-react";

export default function AgeRestricted() {
  return (
    <div className="min-h-screen bg-brand-dark text-white flex items-center justify-center p-4">
      <Card className="max-w-lg w-full bg-white/5 border-brand-border shadow-2xl">
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
          <div className="bg-white/5 rounded-lg p-4 border border-brand-border">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-brand-gold mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-300">
                <p className="font-medium text-brand-gold mb-2">Why is there an age restriction?</p>
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
              className="w-full bg-brand-gold text-brand-gold-foreground hover:opacity-90 hover:from-amber-500 hover:to-orange-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Website
            </Button>
          </div>

          <div className="border-t border-brand-border pt-6">
            <p className="text-center text-slate-400 text-sm mb-4">
              Have questions? We're here to help.
            </p>
            <Button
              variant="outline"
              className="w-full border-brand-border text-slate-300 hover:bg-white/10"
              onClick={() => window.location.href = "mailto:omega@omegalongevity.com"}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Us
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            By using our website, you agree to our{" "}
            <a href="/terms" className="text-brand-gold hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-brand-gold hover:underline">Privacy Policy</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
