import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ArrowLeft, Scale, CheckCircle2, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function CompareProtocols() {
  const [, setLocation] = useLocation();
  const goBack = useGoBack('/dashboard');
  const { user } = useAuth();
  const trpcUtils = trpc.useUtils();
  
  // Get user's option protocols
  const { data: myProtocols, isLoading } = trpc.clientProtocol.getMyProtocols.useQuery();
  
  const selectOptionMutation = trpc.clientProtocol.selectOption.useMutation({
    onSuccess: () => {
      toast.success("Protocol selected! Other options have been archived.");
      trpcUtils.clientProtocol.getMyProtocols.invalidate();
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast.error(`Failed to select option: ${error.message}`);
    },
  });
  
  const optionProtocols = myProtocols?.options || [];
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }
  
  if (optionProtocols.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Scale className="h-16 w-16 mx-auto text-slate-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">No Options to Compare</h1>
          <p className="text-slate-400 mb-6">
            You don't have any protocol options to compare at this time.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <Scale className="h-7 w-7 text-orange-500" />
              Compare Protocol Options
            </h1>
            <p className="text-slate-400 mt-1">
              Review and select the protocol that best fits your needs
            </p>
          </div>
        </div>
        
        {/* Comparison Grid */}
        <div className={`grid gap-6 ${optionProtocols.length === 2 ? 'md:grid-cols-2' : optionProtocols.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
          {optionProtocols.map((protocol: any) => (
            <Card key={protocol.id} className="bg-slate-900/50 border-slate-700 hover:border-orange-500/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-xl">
                      {protocol.versionName || `Version ${protocol.version || 1}`}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Created {toLocaleDateStringMT(protocol.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-orange-400 border-orange-400/50">
                    Option
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Protocol Summary */}
                <div className="space-y-4">
                  {/* Duration */}
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="p-2 rounded-lg bg-slate-800">
                      <Package className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Duration</p>
                      <p className="font-medium">{protocol.durationMonths} months</p>
                    </div>
                  </div>
                  
                  {/* Coaching Package */}
                  {protocol.coachingPackage && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <div className="p-2 rounded-lg bg-slate-800">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Package</p>
                        <p className="font-medium">{protocol.coachingPackage}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Price */}
                  {protocol.coachingPrice && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <div className="p-2 rounded-lg bg-slate-800">
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Investment</p>
                        <p className="font-medium text-lg">${protocol.coachingPrice}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Notes */}
                {protocol.notes && (
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-400 mb-1">Coach Notes</p>
                    <p className="text-slate-300 text-sm">{protocol.notes}</p>
                  </div>
                )}
                
                {/* Actions */}
                <div className="space-y-3 pt-4 border-t border-slate-700">
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => selectOptionMutation.mutate({ protocolId: protocol.id })}
                    disabled={selectOptionMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Select This Option
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation(`/protocol/${protocol.accessToken}`)}
                  >
                    View Full Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Help Text */}
        <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700 text-center">
          <p className="text-slate-400 text-sm">
            Need help deciding? Contact your coach to discuss which option is best for your goals.
          </p>
        </div>
      </div>
    </div>
  );
}
