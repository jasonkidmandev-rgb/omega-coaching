import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { TabsContent } from "@/components/ui/tabs";
import { Camera, Image, FileText } from "lucide-react";

type ProgressPhoto = {
  id: number;
  imageUrl: string;
  caption: string | null;
  category: "before" | "progress" | "after" | "other";
  createdAt: Date | string;
};

type JournalNote = {
  id: number;
  content: string;
  mood: "great" | "good" | "okay" | "tired" | "stressed" | "struggling" | "difficult" | null;
  energyLevel: number | null;
  sleepQuality: number | null;
  createdAt: Date | string;
};

type ProgressTabProps = {
  clientName: string;
  progressPhotos: ProgressPhoto[];
  journalNotes: JournalNote[];
  isSubTab?: boolean;
};

export default function ProgressTab({
  clientName,
  progressPhotos,
  journalNotes,
  isSubTab = false,
}: ProgressTabProps) {
  const content = (
    <div className="space-y-6">
      {/* Progress Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Progress Photos
          </CardTitle>
          <CardDescription>
            View {clientName}'s progress photos uploaded over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progressPhotos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No progress photos uploaded yet.</p>
              <p className="text-sm mt-1">Photos will appear here when the client uploads them from their dashboard.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(['before', 'progress', 'after'] as const).map(category => {
                const categoryPhotos = progressPhotos.filter((p) => p.category === category);
                if (categoryPhotos.length === 0) return null;
                return (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 capitalize">{category} Photos ({categoryPhotos.length})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {categoryPhotos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.imageUrl}
                            alt={photo.caption || `${category} photo`}
                            className="w-full h-40 object-cover rounded-lg border"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg">
                            <p className="truncate">{photo.caption || 'No caption'}</p>
                            <p className="text-white/70">{toLocaleDateStringMT(photo.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journal Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Journey Notes
          </CardTitle>
          <CardDescription>
            View {clientName}'s journal entries and wellness tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {journalNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No journal entries yet.</p>
              <p className="text-sm mt-1">Notes will appear here when the client logs their journey from their dashboard.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {journalNotes.map((note) => (
                <div key={note.id} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {note.mood === 'great' && '😊'}
                          {note.mood === 'good' && '🙂'}
                          {note.mood === 'okay' && '😐'}
                          {note.mood === 'tired' && '😴'}
                          {note.mood === 'stressed' && '😰'}
                          {note.mood === 'struggling' && '😓'}
                          {note.mood === 'difficult' && '😣'}
                          {note.mood === null && '📝'}
                        </span>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {note.energyLevel && (
                            <span>Energy: {note.energyLevel}/10</span>
                          )}
                          {note.sleepQuality && (
                            <span>Sleep: {note.sleepQuality}/10</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {toLocaleDateStringMT(note.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (isSubTab) return content;
  return <TabsContent value="progress">{content}</TabsContent>;
}
