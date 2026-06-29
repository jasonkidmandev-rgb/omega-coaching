import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { FileText, Pen, Check, AlertTriangle, RefreshCw, Loader2, CheckCircle } from "lucide-react";

export default function WaiverRenewal() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [hasReadWaiver, setHasReadWaiver] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [renewalComplete, setRenewalComplete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch waiver info by token
  const { data: waiverInfo, isLoading, error } = trpc.waiver.getByRenewalToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const renewMutation = trpc.waiver.renew.useMutation({
    onSuccess: () => {
      setRenewalComplete(true);
    },
  });

  // Canvas signature handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
  };

  const isFormValid = hasReadWaiver && hasAgreed && signatureData;

  const handleSubmit = () => {
    if (!isFormValid || !token) return;
    renewMutation.mutate({
      token,
      signatureData,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Invalid or expired token
  if (error || !waiverInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <CardTitle className="text-xl text-white">Invalid or Expired Link</CardTitle>
              <CardDescription className="text-slate-400">
                This waiver renewal link is no longer valid. It may have already been used or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-400 mb-4">
                If you need to renew your waiver, please contact your coach.
              </p>
              <Button onClick={() => setLocation("/launchpad")} className="bg-orange-600 hover:bg-orange-700">
                Go to Launchpad
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Renewal complete
  if (renewalComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-xl text-white">Waiver Renewed Successfully!</CardTitle>
              <CardDescription className="text-slate-400">
                Thank you, {waiverInfo.firstName}! Your waiver has been renewed successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setLocation("/launchpad")} className="bg-orange-600 hover:bg-orange-700">
                Go to Launchpad
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center border-b border-slate-700 pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-500/20 rounded-full">
                <RefreshCw className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-2xl md:text-3xl text-white">
              Renew Your Store Waiver
            </CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Hi {waiverInfo.firstName}, your waiver {waiverInfo.expiresAt ? `expired on ${toLocaleDateStringMT(waiverInfo.expiresAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}` : 'needs renewal'}. Please review and sign below to continue accessing the Omega Store.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Your Information (Read-only) */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Your Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Name:</span>
                  <span className="text-white ml-2">{waiverInfo.firstName} {waiverInfo.lastName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span>
                  <span className="text-white ml-2">{waiverInfo.email}</span>
                </div>
              </div>
            </div>

            {/* Waiver Content */}
            <ScrollArea className="h-[300px] rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="space-y-6 text-slate-300 text-sm leading-relaxed pr-4">
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-2">1. Consulting Waiver and Release of Liability</h3>
                  <p>
                    I, the undersigned, understand and acknowledge that the consulting services provided by Omega Longevity and its representatives ("Consultant") are for informational and educational purposes only. These services are not intended to diagnose, treat, cure, or prevent any disease or medical condition.
                  </p>
                  <p className="mt-2">
                    I acknowledge that the Consultant is not a licensed medical professional, and any advice or recommendations provided should not be construed as medical advice. I agree to consult with a qualified healthcare provider before making any changes to my health regimen, including but not limited to diet, exercise, supplements, or medications.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-2">2. Assumption of Risk</h3>
                  <p>
                    I understand that participating in any health optimization program, including the use of peptides, supplements, or other substances, carries inherent risks. I voluntarily assume all risks associated with my participation, including but not limited to physical injury, adverse reactions, or other health complications.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-2">3. Release and Indemnification</h3>
                  <p>
                    I hereby release, discharge, and hold harmless Omega Longevity, its owners, employees, agents, and affiliates from any and all claims, liabilities, damages, or expenses arising out of or related to the consulting services provided or my participation in any recommended programs or protocols.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-2">4. Collaboration Agreement</h3>
                  <p>
                    I understand that the products available through the Omega Store are provided as part of a collaboration between myself and Omega Longevity. By purchasing these products, I acknowledge that I am participating in a collaborative health optimization journey and that the products are intended for my personal use only.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-2">5. Confidentiality</h3>
                  <p>
                    I agree to keep confidential all information shared during our consulting relationship, including but not limited to protocols, product recommendations, and pricing information.
                  </p>
                </section>
              </div>
            </ScrollArea>

            {/* Acknowledgment Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="read-waiver"
                  checked={hasReadWaiver}
                  onCheckedChange={(checked) => setHasReadWaiver(checked === true)}
                  className="mt-1"
                />
                <label htmlFor="read-waiver" className="text-sm text-slate-300 cursor-pointer">
                  I have read and understand the waiver, release of liability, and collaboration agreement above.
                </label>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agree-terms"
                  checked={hasAgreed}
                  onCheckedChange={(checked) => setHasAgreed(checked === true)}
                  className="mt-1"
                />
                <label htmlFor="agree-terms" className="text-sm text-slate-300 cursor-pointer">
                  I agree to the terms and conditions, and I acknowledge that I am voluntarily participating in this program.
                </label>
              </div>
            </div>

            {/* Signature Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pen className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-white">Your Signature</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                  className="text-slate-400 hover:text-white"
                >
                  Clear
                </Button>
              </div>
              <div className="border border-slate-700 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={150}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Draw your signature above using your mouse or finger
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || renewMutation.isPending}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg"
            >
              {renewMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Renewing Waiver...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Renew My Waiver
                </>
              )}
            </Button>

            {renewMutation.error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{renewMutation.error.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
