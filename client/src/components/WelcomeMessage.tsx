import { Sun, Moon, CloudSun } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Deliberately a slim row, not a padded Card - it used to be a heavy card with an
// icon circle, a big heading, and a full sentence of copy, which was a lot of space
// just to say hello every time someone opens the dashboard.
export function WelcomeMessage({ name, coachName, className }: WelcomeMessageProps) {
  const greeting = getGreeting();
  const Icon = greeting.icon;
  const firstName = getFirstName(name);

  return (
    <div className={cn("flex items-center gap-3 py-1", className)}>
      <div className="w-9 h-9 rounded-full bg-brand-gold/15 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-brand-gold" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          {greeting.text}, {firstName}
        </h2>
        {coachName && (
          <p className="text-xs text-gray-500">Your coach {coachName} has this ready for you</p>
        )}
      </div>
    </div>
  );
}
