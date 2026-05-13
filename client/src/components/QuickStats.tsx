import { Card, CardContent } from "@/components/ui/card";
import { Pill, Calendar, Package, DollarSign, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickStatsProps {
  totalItems: number;
  durationMonths: number;
  totalCost?: number;
  peptideCount?: number;
  supplementCount?: number;
  showCost?: boolean;
  className?: string;
}

export function QuickStats({
  totalItems,
  durationMonths,
  totalCost,
  peptideCount = 0,
  supplementCount = 0,
  showCost = true,
  className,
}: QuickStatsProps) {
  const stats = [
    {
      label: "Duration",
      value: `${durationMonths} mo`,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Items",
      value: totalItems.toString(),
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Peptides",
      value: peptideCount.toString(),
      icon: Pill,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    ...(showCost && totalCost
      ? [
          {
            label: "Investment",
            value: `$${totalCost.toFixed(0)}`,
            icon: TrendingUp,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ]
      : []),
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {stats.map((stat) => (
        <Card key={stat.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
