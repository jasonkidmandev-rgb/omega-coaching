import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Sun, Moon, CloudSun } from "lucide-react";

interface WelcomeMessageProps {
  name: string;
  coachName?: string;
  className?: string;
}

function getGreeting(): { text: string; icon: any } {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return { text: "Good morning", icon: Sun };
  } else if (hour >= 12 && hour < 17) {
    return { text: "Good afternoon", icon: CloudSun };
  } else if (hour >= 17 && hour < 21) {
    return { text: "Good evening", icon: CloudSun };
  } else {
    return { text: "Good night", icon: Moon };
  }
}

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

export function WelcomeMessage({ name, coachName, className }: WelcomeMessageProps) {
  const greeting = getGreeting();
  const Icon = greeting.icon;
  const firstName = getFirstName(name);

  return (
    <Card className={`bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {greeting.text}, {firstName}! <Sparkles className="inline h-5 w-5 text-amber-500" />
            </h2>
            <p className="text-muted-foreground mt-1">
              Welcome to your personalized health protocol. 
              {coachName && ` Your coach ${coachName} has prepared this plan just for you.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
