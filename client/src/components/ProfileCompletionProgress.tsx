import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface ProfileCompletionProgressProps {
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  compact?: boolean;
}

interface FieldStatus {
  name: string;
  complete: boolean;
  required: boolean;
}

export function ProfileCompletionProgress({
  clientName,
  clientEmail,
  clientPhone,
  shippingStreet,
  shippingCity,
  shippingState,
  shippingZip,
  shippingCountry,
  compact = false,
}: ProfileCompletionProgressProps) {
  // Define required fields for profile completion
  const fields: FieldStatus[] = [
    { name: "Name", complete: !!clientName && clientName.trim() !== "", required: true },
    { name: "Email", complete: !!clientEmail && clientEmail.trim() !== "", required: true },
    { name: "Phone", complete: !!clientPhone && clientPhone.trim() !== "", required: false },
    { name: "Street Address", complete: !!shippingStreet && shippingStreet.trim() !== "", required: true },
    { name: "City", complete: !!shippingCity && shippingCity.trim() !== "", required: true },
    { name: "State", complete: !!shippingState && shippingState.trim() !== "", required: true },
    { name: "ZIP Code", complete: !!shippingZip && shippingZip.trim() !== "", required: true },
    { name: "Country", complete: !!shippingCountry && shippingCountry.trim() !== "", required: false },
  ];

  const requiredFields = fields.filter(f => f.required);
  const completedRequired = requiredFields.filter(f => f.complete).length;
  const totalRequired = requiredFields.length;
  const percentage = Math.round((completedRequired / totalRequired) * 100);

  const missingFields = fields.filter(f => f.required && !f.complete);
  const optionalMissing = fields.filter(f => !f.required && !f.complete);

  // Color coding based on percentage
  const getProgressColor = () => {
    if (percentage === 100) return "bg-green-500";
    if (percentage >= 80) return "bg-green-400";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getStatusIcon = () => {
    if (percentage === 100) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (percentage >= 50) {
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  if (compact) {
    // Compact version for table rows
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              {getStatusIcon()}
              <div className="w-16">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className={`h-full transition-all ${getProgressColor()}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{percentage}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">Profile Completion: {percentage}%</p>
              {missingFields.length > 0 && (
                <div>
                  <p className="text-xs text-red-400 font-medium">Missing Required:</p>
                  <ul className="text-xs list-disc list-inside">
                    {missingFields.map(f => (
                      <li key={f.name}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {optionalMissing.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Optional:</p>
                  <ul className="text-xs list-disc list-inside text-muted-foreground">
                    {optionalMissing.map(f => (
                      <li key={f.name}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {percentage === 100 && (
                <p className="text-xs text-green-400">✓ Profile complete!</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full version for detail views
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Profile Completion</span>
        <span className="text-sm text-muted-foreground">{percentage}%</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div 
          className={`h-full transition-all ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {fields.map(field => (
          <div 
            key={field.name} 
            className={`flex items-center gap-1 ${field.complete ? 'text-green-600' : field.required ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            {field.complete ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : field.required ? (
              <XCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span>{field.name}</span>
            {!field.required && <span className="text-muted-foreground">(optional)</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileCompletionProgress;
