import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Scale, TrendingUp, TrendingDown, Minus, Plus, Calendar, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ClientMetrics() {
  const [, setLocation] = useLocation();
  const goBack = useGoBack('/dashboard');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFatPercentage, setBodyFatPercentage] = useState("");
  const [leanMass, setLeanMass] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  // Fetch metrics history
  const { data: metrics, isLoading, refetch } = trpc.clientMetrics.getMyMetrics.useQuery();
  
  // Add metric mutation
  const addMetricMutation = trpc.clientMetrics.addMetric.useMutation({
    onSuccess: () => {
      setFormError(null);
      setFormSuccess("Metrics saved successfully!");
      toast.success("Metrics saved successfully");
      refetch();
      // Close dialog after a brief delay so user sees the success message
      setTimeout(() => {
        setAddDialogOpen(false);
        resetForm();
      }, 1000);
    },
    onError: (error: any) => {
      const message = error.message || "Failed to save metrics. Please try again.";
      setFormError(message);
      setFormSuccess(null);
      toast.error(message);
    }
  });
  
  const resetForm = () => {
    setWeight("");
    setBodyFatPercentage("");
    setLeanMass("");
    setNotes("");
    setFormError(null);
    setFormSuccess(null);
  };
  
  const handleDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };
  
  const handleSubmit = () => {
    setFormError(null);
    setFormSuccess(null);
    
    if (!weight && !bodyFatPercentage && !leanMass) {
      setFormError("Please enter at least one metric");
      return;
    }
    
    addMetricMutation.mutate({
      weight: weight ? parseFloat(weight) : undefined,
      bodyFatPercentage: bodyFatPercentage ? parseFloat(bodyFatPercentage) : undefined,
      leanMass: leanMass ? parseFloat(leanMass) : undefined,
      notes: notes || undefined,
    });
  };
  
  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };
  
  // Prepare chart data
  // Define the metric type
  type MetricEntry = {
    id: number;
    recordedAt: Date;
    weight: number | null;
    bodyFatPercentage: number | null;
    leanMass: number | null;
    notes: string | null;
  };
  
  const chartData = metrics?.slice().reverse().map((m: MetricEntry) => ({
    date: format(new Date(m.recordedAt), 'MMM d'),
    weight: m.weight,
    bodyFat: m.bodyFatPercentage,
    leanMass: m.leanMass,
  })) || [];
  
  const latestMetric = metrics?.[0];
  const previousMetric = metrics?.[1];
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Metrics</h1>
            <p className="text-muted-foreground">Track your weight, body fat, and lean mass over time</p>
          </div>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Metrics Entry</DialogTitle>
              <DialogDescription>
                Record your latest measurements. You don't need to fill in all fields.
              </DialogDescription>
            </DialogHeader>
            
            {/* Inline error message */}
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            
            {/* Inline success message */}
            {formSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 175.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bodyFat">Body Fat %</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 18.5"
                  value={bodyFatPercentage}
                  onChange={(e) => setBodyFatPercentage(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="leanMass">Lean Mass (lbs)</Label>
                <Input
                  id="leanMass"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 143.0"
                  value={leanMass}
                  onChange={(e) => setLeanMass(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any notes about this measurement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={addMetricMutation.isPending}>
                {addMetricMutation.isPending ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {latestMetric?.weight ? `${latestMetric.weight} lbs` : "—"}
                </span>
              </div>
              {getTrendIcon(latestMetric?.weight || null, previousMetric?.weight || null)}
            </div>
            {latestMetric?.recordedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {format(new Date(latestMetric.recordedAt), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Body Fat %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {latestMetric?.bodyFatPercentage ? `${latestMetric.bodyFatPercentage}%` : "—"}
              </span>
              {getTrendIcon(latestMetric?.bodyFatPercentage || null, previousMetric?.bodyFatPercentage || null)}
            </div>
            {previousMetric?.bodyFatPercentage && latestMetric?.bodyFatPercentage && (
              <p className="text-xs text-muted-foreground mt-2">
                Change: {(latestMetric.bodyFatPercentage - previousMetric.bodyFatPercentage).toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lean Mass</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {latestMetric?.leanMass ? `${latestMetric.leanMass} lbs` : "—"}
              </span>
              {getTrendIcon(latestMetric?.leanMass || null, previousMetric?.leanMass || null)}
            </div>
            {previousMetric?.leanMass && latestMetric?.leanMass && (
              <p className="text-xs text-muted-foreground mt-2">
                Change: {(latestMetric.leanMass - previousMetric.leanMass).toFixed(1)} lbs
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Trend Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Progress Over Time</CardTitle>
            <CardDescription>Your metrics trend over the past entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="weight"
                    stroke="#8884d8"
                    name="Weight (lbs)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="#82ca9d"
                    name="Body Fat %"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="leanMass"
                    stroke="#ffc658"
                    name="Lean Mass (lbs)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Measurement History</CardTitle>
          <CardDescription>All your recorded measurements</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics && metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Weight</th>
                    <th className="text-left py-2 px-4">Body Fat %</th>
                    <th className="text-left py-2 px-4">Lean Mass</th>
                    <th className="text-left py-2 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric: MetricEntry) => (
                    <tr key={metric.id} className="border-b">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(metric.recordedAt), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="py-2 px-4">{metric.weight ? `${metric.weight} lbs` : "—"}</td>
                      <td className="py-2 px-4">{metric.bodyFatPercentage ? `${metric.bodyFatPercentage}%` : "—"}</td>
                      <td className="py-2 px-4">{metric.leanMass ? `${metric.leanMass} lbs` : "—"}</td>
                      <td className="py-2 px-4 text-muted-foreground">{metric.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No measurements recorded yet</p>
              <p className="text-sm">Click "Add Entry" to record your first measurement</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
