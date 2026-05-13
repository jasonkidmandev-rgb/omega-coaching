import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";
import { Target, TrendingUp, Calendar, DollarSign, Edit2, Trash2, Plus, Check, X, Lightbulb, Sparkles, ArrowUp, ArrowDown, Minus, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function RevenueGoals() {
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<{
    year: number;
    month: number;
    targetAmount: number;
    notes?: string;
  } | null>(null);

  // Form state
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Queries
  const { data: upcomingData, refetch: refetchUpcoming } = trpc.revenueGoals.getUpcoming.useQuery();
  const { data: currentMonthData } = trpc.revenueGoals.getCurrentMonthProgress.useQuery();
  const { data: statsData } = trpc.paymentHistory.getSummary.useQuery();
  const { data: suggestionsData, isLoading: suggestionsLoading } = trpc.revenueGoals.getSuggestions.useQuery(
    undefined,
    { enabled: showSuggestions }
  );

  // Mutations
  const upsertMutation = trpc.revenueGoals.upsert.useMutation({
    onSuccess: () => {
      toast.success("Revenue goal saved");
      setIsDialogOpen(false);
      setEditingGoal(null);
      resetForm();
      refetchUpcoming();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.revenueGoals.delete.useMutation({
    onSuccess: () => {
      toast.success("Revenue goal deleted");
      refetchUpcoming();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormYear(new Date().getFullYear());
    setFormMonth(new Date().getMonth() + 1);
    setFormAmount("");
    setFormNotes("");
  };

  const handleEdit = (goal: any) => {
    setEditingGoal(goal);
    setFormYear(goal.year);
    setFormMonth(goal.month);
    setFormAmount(goal.goal?.targetAmount?.toString() || "");
    setFormNotes(goal.goal?.notes || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    upsertMutation.mutate({
      year: formYear,
      month: formMonth,
      targetAmount: amount,
      notes: formNotes || undefined,
    });
  };

  const handleDelete = (goalId: number) => {
    if (confirm("Are you sure you want to delete this revenue goal?")) {
      deleteMutation.mutate({ id: goalId });
    }
  };

  const handleApplySuggestion = (suggestion: { year: number; month: number; suggestedAmount: number }) => {
    setFormYear(suggestion.year);
    setFormMonth(suggestion.month);
    setFormAmount(suggestion.suggestedAmount.toString());
    setFormNotes(`AI-suggested goal based on historical data`);
    setIsDialogOpen(true);
  };

  const handleApplyAllSuggestions = async () => {
    if (!suggestionsData?.data?.suggestions) return;
    
    const confirmed = confirm(
      `This will set goals for all ${suggestionsData.data.suggestions.length} months. Continue?`
    );
    if (!confirmed) return;

    for (const suggestion of suggestionsData.data.suggestions) {
      await upsertMutation.mutateAsync({
        year: suggestion.year,
        month: suggestion.month,
        targetAmount: suggestion.suggestedAmount,
        notes: `AI-suggested goal (${suggestion.confidence} confidence)`,
      });
    }
    toast.success("All suggested goals have been applied");
    setShowSuggestions(false);
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">High</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Medium</span>;
      case 'low':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Low</span>;
      default:
        return null;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing':
        return <ArrowUp className="h-4 w-4 text-green-400" />;
      case 'declining':
        return <ArrowDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  // Calculate current month progress
  const currentMonthRevenue = statsData?.data?.currentMonthRevenue || 0;
  const currentMonthGoal = currentMonthData?.data?.goal?.targetAmount 
    ? parseFloat(currentMonthData.data.goal.targetAmount) 
    : 0;
  const progressPercent = currentMonthGoal > 0 
    ? Math.min(100, (currentMonthRevenue / currentMonthGoal) * 100) 
    : 0;

  return (
    <AdminLayout>
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Revenue Goals
          </h1>
          <p className="text-muted-foreground mt-1">
            Set and track monthly revenue targets
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={showSuggestions ? "bg-primary/10" : ""}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Suggestions
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingGoal(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Set Goal
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit Revenue Goal" : "Set Revenue Goal"}</DialogTitle>
              <DialogDescription>
                Set a monthly revenue target to track your business performance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={formYear.toString()}
                    onValueChange={(v) => setFormYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    value={formMonth.toString()}
                    onValueChange={(v) => setFormMonth(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, idx) => (
                        <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10000.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Add any notes about this goal..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "Saving..." : "Save Goal"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Current Month Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Month Progress
          </CardTitle>
          <CardDescription>
            {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">Current Revenue</p>
                <p className="text-3xl font-bold">${currentMonthRevenue.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-2xl font-semibold">
                  {currentMonthGoal > 0 ? `$${currentMonthGoal.toLocaleString()}` : "Not set"}
                </p>
              </div>
            </div>
            {currentMonthGoal > 0 && (
              <>
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      progressPercent >= 100 ? "bg-green-500" : 
                      progressPercent >= 75 ? "bg-primary" : 
                      progressPercent >= 50 ? "bg-yellow-500" : "bg-orange-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progressPercent.toFixed(1)}% of goal
                  </span>
                  <span className={progressPercent >= 100 ? "text-green-500 font-medium" : "text-muted-foreground"}>
                    {progressPercent >= 100 ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-4 w-4" /> Goal achieved!
                      </span>
                    ) : (
                      `$${(currentMonthGoal - currentMonthRevenue).toLocaleString()} remaining`
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Goals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Goals (Next 12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Target Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingData?.data?.map((item) => {
                const isCurrentMonth = 
                  item.year === new Date().getFullYear() && 
                  item.month === new Date().getMonth() + 1;
                const isPast = 
                  item.year < new Date().getFullYear() || 
                  (item.year === new Date().getFullYear() && item.month < new Date().getMonth() + 1);
                
                return (
                  <TableRow key={`${item.year}-${item.month}`} className={isCurrentMonth ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.monthName} {item.year}
                        {isCurrentMonth && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.goal ? (
                        <span className="font-semibold text-green-600">
                          ${parseFloat(item.goal.targetAmount).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.goal?.notes || "-"}
                    </TableCell>
                    <TableCell>
                      {item.goal ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <Check className="h-4 w-4" /> Set
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <X className="h-4 w-4" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {item.goal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(item.goal!.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI Suggestions Panel */}
      {showSuggestions && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              AI-Powered Goal Suggestions
            </CardTitle>
            <CardDescription>
              Based on your historical revenue data and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : suggestionsData?.data ? (
              <div className="space-y-6">
                {/* Statistics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground">Total Revenue (12mo)</p>
                    <p className="text-2xl font-bold">
                      ${suggestionsData.data.statistics.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground">Average Monthly</p>
                    <p className="text-2xl font-bold">
                      ${suggestionsData.data.statistics.averageMonthly.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground">Months with Data</p>
                    <p className="text-2xl font-bold">
                      {suggestionsData.data.statistics.monthsWithData}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground">Growth Trend</p>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(suggestionsData.data.statistics.trend)}
                      <span className="text-2xl font-bold">
                        {suggestionsData.data.statistics.growthRate > 0 ? "+" : ""}
                        {suggestionsData.data.statistics.growthRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apply All Button */}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {suggestionsData.data.suggestions.length} month suggestions available
                  </p>
                  <Button onClick={handleApplyAllSuggestions} disabled={upsertMutation.isPending}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Apply All Suggestions
                  </Button>
                </div>

                {/* Suggestions Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Suggested Goal</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Reasoning</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestionsData.data.suggestions.map((suggestion) => (
                      <TableRow key={`${suggestion.year}-${suggestion.month}`}>
                        <TableCell className="font-medium">
                          {suggestion.monthName} {suggestion.year}
                        </TableCell>
                        <TableCell>
                          <span className="text-lg font-bold text-primary">
                            ${suggestion.suggestedAmount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getConfidenceBadge(suggestion.confidence)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {suggestion.reasoning}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplySuggestion(suggestion)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Apply
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Data Quality Warning */}
                {suggestionsData.data.statistics.monthsWithData < 3 && (
                  <div className="flex items-start gap-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-500">Limited Data Available</p>
                      <p className="text-sm text-muted-foreground">
                        Suggestions are based on only {suggestionsData.data.statistics.monthsWithData} month(s) of data.
                        Consider adjusting goals manually for more accuracy.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load suggestions. Please try again.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </AdminLayout>
  );
}