import { CheckCircle, Eye, Send } from "lucide-react";

type ActivityIndicatorsProps = {
  sentAt: Date | string | null;
  firstViewedAt: Date | string | null;
  approvedAt: Date | string | null;
  status: string;
};

export default function ActivityIndicators({ 
  sentAt, 
  firstViewedAt, 
  approvedAt,
  status 
}: ActivityIndicatorsProps) {
  const indicators = [];
  
  // Sent indicator
  if (sentAt) {
    indicators.push(
      <span 
        key="sent" 
        className="inline-flex items-center gap-1 text-xs text-blue-600" 
        title={`Sent: ${new Date(sentAt).toLocaleString()}`}
      >
        <Send className="h-3 w-3" />
        Sent
      </span>
    );
  }
  
  // Opened/Viewed indicator
  if (firstViewedAt) {
    indicators.push(
      <span 
        key="opened" 
        className="inline-flex items-center gap-1 text-xs text-green-600" 
        title={`Opened: ${new Date(firstViewedAt).toLocaleString()}`}
      >
        <Eye className="h-3 w-3" />
        Opened
      </span>
    );
  }
  
  // Approved/Completed indicator
  if (status === 'approved' || status === 'completed') {
    indicators.push(
      <span 
        key="completed" 
        className="inline-flex items-center gap-1 text-xs text-purple-600" 
        title={approvedAt ? `Approved: ${new Date(approvedAt).toLocaleString()}` : 'Approved'}
      >
        <CheckCircle className="h-3 w-3" />
        {status === 'completed' ? 'Completed' : 'Approved'}
      </span>
    );
  }
  
  if (indicators.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }
  
  return (
    <div className="flex flex-col gap-1">
      {indicators}
    </div>
  );
}
