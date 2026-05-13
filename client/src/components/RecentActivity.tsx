import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  Mail,
  Package,
  DollarSign,
  Edit,
  Plus,
  Send,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "client_created" | "protocol_sent" | "protocol_approved" | "protocol_viewed" | "payment_received" | "template_updated" | "item_added";
  title: string;
  description?: string;
  timestamp: Date;
  link?: string;
}

interface RecentActivityProps {
  activities: Activity[];
  className?: string;
}

const activityIcons = {
  client_created: { icon: Plus, color: "text-blue-500", bg: "bg-blue-50" },
  protocol_sent: { icon: Send, color: "text-amber-500", bg: "bg-amber-50" },
  protocol_approved: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
  protocol_viewed: { icon: Eye, color: "text-purple-500", bg: "bg-purple-50" },
  payment_received: { icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
  template_updated: { icon: FileText, color: "text-indigo-500", bg: "bg-indigo-50" },
  item_added: { icon: Package, color: "text-orange-500", bg: "bg-orange-50" },
};

export function RecentActivity({ activities, className }: RecentActivityProps) {
  const [, setLocation] = useLocation();

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Your latest actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity to show
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>Your latest actions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const config = activityIcons[activity.type];
            const Icon = config.icon;

            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  activity.link && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => activity.link && setLocation(activity.link)}
              >
                <div className={cn("p-2 rounded-full", config.bg)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to generate activities from client data
export function generateActivitiesFromClients(clients: any[]): Activity[] {
  const activities: Activity[] = [];

  clients.forEach((client) => {
    // Created activity
    if (client.createdAt) {
      activities.push({
        id: `created-${client.id}`,
        type: "client_created",
        title: `Created protocol for ${client.clientName}`,
        timestamp: new Date(client.createdAt),
        link: `/admin/clients/${client.id}`,
      });
    }

    // Sent activity
    if (client.sentAt) {
      activities.push({
        id: `sent-${client.id}`,
        type: "protocol_sent",
        title: `Sent protocol to ${client.clientName}`,
        timestamp: new Date(client.sentAt),
        link: `/admin/clients/${client.id}`,
      });
    }

    // Approved activity
    if (client.status === "approved" && client.approvedAt) {
      activities.push({
        id: `approved-${client.id}`,
        type: "protocol_approved",
        title: `${client.clientName} approved their protocol`,
        timestamp: new Date(client.approvedAt),
        link: `/admin/clients/${client.id}`,
      });
    }

    // Payment activity
    if (client.paymentStatus === "paid" && client.paidAt) {
      activities.push({
        id: `paid-${client.id}`,
        type: "payment_received",
        title: `Payment received from ${client.clientName}`,
        timestamp: new Date(client.paidAt),
        link: `/admin/clients/${client.id}`,
      });
    }
  });

  // Sort by timestamp descending and take top 10
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);
}
