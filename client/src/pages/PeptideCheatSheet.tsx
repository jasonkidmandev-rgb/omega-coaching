import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Download, ExternalLink, Loader2, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { goBackTo } from "@/hooks/useGoBack";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

type Peptide = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  dosage: string | null;
  frequency: string | null;
  isActive: boolean;
};

type PeptideCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  peptides: Peptide[];
};

export default function PeptideCheatSheet() {
  const [, setLocation] = useLocation();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const trpcUtils = trpc.useUtils();
  
  // Fetch peptide data from database using PUBLIC endpoint
  const { data: cheatSheetData, isLoading } = trpc.peptide.getCheatSheet.useQuery();
  
  // Fetch user's favorite peptide IDs (only if logged in)
  const { data: favoriteIds } = trpc.peptide.getFavoriteIds.useQuery(undefined, {
    retry: false,
    // This will fail silently for non-logged-in users
  });
  
  // Toggle favorite mutation
  const toggleFavorite = trpc.peptide.toggleFavorite.useMutation({
    onSuccess: (result) => {
      trpcUtils.peptide.getFavoriteIds.invalidate();
      if (result.isFavorited) {
        toast.success("Added to favorites");
      } else {
        toast.success("Removed from favorites");
      }
    },
    onError: (error) => {
      if (error.message.includes("UNAUTHORIZED")) {
        toast.error("Please log in to save favorites");
      } else {
        toast.error("Failed to update favorites");
      }
    },
  });
  
  const isLoggedIn = favoriteIds !== undefined;
  const favoriteSet = new Set(favoriteIds || []);

  // Filter to show only favorites if toggle is on
  const filteredCategories = showFavoritesOnly 
    ? (cheatSheetData || []).map(cat => ({
        ...cat,
        peptides: cat.peptides.filter(p => favoriteSet.has(p.id))
      })).filter(cat => cat.peptides.length > 0)
    : (cheatSheetData || []).filter(cat => cat.peptides.length > 0);
  
  const handleToggleFavorite = (peptideId: number) => {
    toggleFavorite.mutate({ peptideId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goBackTo("/launchpad")}
                className="text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="h-6 w-6 text-orange-500" />
                  Peptide Cheat Sheet
                </h1>
                <p className="text-slate-400 text-sm">Quick reference guide for common peptides</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoggedIn && (
                <Button
                  variant={showFavoritesOnly ? "default" : "outline"}
                  className={showFavoritesOnly 
                    ? "bg-pink-500 hover:bg-pink-600 text-white" 
                    : "border-pink-500 text-pink-500 hover:bg-pink-500/10"
                  }
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  <Heart className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  {showFavoritesOnly ? "Showing Favorites" : "My Favorites"}
                  {favoriteSet.size > 0 && (
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {favoriteSet.size}
                    </span>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                onClick={() => window.print()}
              >
                <Download className="h-4 w-4 mr-2" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Disclaimer */}
        <Card className="bg-amber-500/10 border-amber-500/30 mb-8">
          <CardContent className="py-4">
            <p className="text-amber-200 text-sm">
              <strong>Disclaimer:</strong> This information is for educational purposes only and should not be considered medical advice. 
              Always consult with a qualified healthcare provider before starting any peptide protocol. 
              Dosing may vary based on individual factors and should be personalized by your practitioner.
            </p>
          </CardContent>
        </Card>
        
        {/* Favorites hint for non-logged-in users */}
        {!isLoggedIn && !isLoading && (
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-pink-500" />
                <p className="text-slate-300 text-sm">
                  <Button 
                    variant="link" 
                    className="text-orange-500 p-0 h-auto"
                    onClick={() => window.location.href = getLoginUrl('/peptide-cheat-sheet')}
                  >
                    Log in
                  </Button>
                  {" "}to save your favorite peptides for quick reference.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-3 text-slate-300">Loading peptide data...</span>
          </div>
        )}

        {/* Peptide Categories */}
        {!isLoading && (
          <div className="grid gap-6">
            {filteredCategories.map((category) => (
              <Card key={category.id} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl text-white">{category.name}</CardTitle>
                  <CardDescription className="text-slate-400">{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {isLoggedIn && (
                            <th className="text-center py-3 px-2 text-orange-500 font-semibold w-12">
                              <Heart className="h-4 w-4 mx-auto" />
                            </th>
                          )}
                          <th className="text-left py-3 px-4 text-orange-500 font-semibold">Peptide</th>
                          <th className="text-left py-3 px-4 text-orange-500 font-semibold">Purpose</th>
                          <th className="text-left py-3 px-4 text-orange-500 font-semibold">Typical Dosing</th>
                          <th className="text-left py-3 px-4 text-orange-500 font-semibold">Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.peptides.map((peptide) => {
                          const isFavorited = favoriteSet.has(peptide.id);
                          return (
                            <tr key={peptide.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                              {isLoggedIn && (
                                <td className="py-3 px-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${isFavorited ? 'text-pink-500 hover:text-pink-400' : 'text-slate-500 hover:text-pink-500'}`}
                                    onClick={() => handleToggleFavorite(peptide.id)}
                                    disabled={toggleFavorite.isPending}
                                  >
                                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                                  </Button>
                                </td>
                              )}
                              <td className="py-3 px-4 text-white font-medium">{peptide.name}</td>
                              <td className="py-3 px-4 text-slate-300">{peptide.description || '-'}</td>
                              <td className="py-3 px-4 text-slate-400 font-mono text-sm">{peptide.dosage || '-'}</td>
                              <td className="py-3 px-4 text-slate-400 font-mono text-sm">{peptide.frequency || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State - No favorites */}
        {!isLoading && showFavoritesOnly && filteredCategories.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <Heart className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Favorites Yet</h3>
              <p className="text-slate-400 mb-4">Click the heart icon next to any peptide to add it to your favorites.</p>
              <Button
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                onClick={() => setShowFavoritesOnly(false)}
              >
                View All Peptides
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State - No peptides at all */}
        {!isLoading && !showFavoritesOnly && filteredCategories.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Peptides Available</h3>
              <p className="text-slate-400">Peptide data is being updated. Please check back soon.</p>
            </CardContent>
          </Card>
        )}

        {/* Footer CTA */}
        <Card className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/30 mt-8">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Ready to Start Your Protocol?</h3>
                <p className="text-slate-300">Work with our team to create a personalized peptide protocol.</p>
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => setLocation("/coaching-programs")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Coaching Options
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
