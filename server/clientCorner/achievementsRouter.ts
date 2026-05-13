import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { clientAchievements, checkins, clientMetrics, documents, clientProtocols } from "../../drizzle/schema";
import { eq, and, sql, count } from "drizzle-orm";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

// Achievement definitions
const ACHIEVEMENTS = {
  // Check-in streaks
  FIRST_CHECKIN: {
    id: 'first_checkin',
    name: 'First Check-In',
    description: 'Completed your first weekly check-in',
    icon: '🎯',
    category: 'checkin',
  },
  CHECKIN_STREAK_4: {
    id: 'checkin_streak_4',
    name: '4 Week Streak',
    description: 'Completed 4 consecutive weekly check-ins',
    icon: '🔥',
    category: 'checkin',
  },
  CHECKIN_STREAK_8: {
    id: 'checkin_streak_8',
    name: '8 Week Streak',
    description: 'Completed 8 consecutive weekly check-ins',
    icon: '⚡',
    category: 'checkin',
  },
  CHECKIN_STREAK_12: {
    id: 'checkin_streak_12',
    name: '12 Week Streak',
    description: 'Completed 12 consecutive weekly check-ins',
    icon: '🏆',
    category: 'checkin',
  },
  
  // Metrics tracking
  FIRST_METRICS: {
    id: 'first_metrics',
    name: 'Metrics Tracker',
    description: 'Logged your first body metrics',
    icon: '📊',
    category: 'metrics',
  },
  METRICS_STREAK_4: {
    id: 'metrics_streak_4',
    name: 'Consistent Tracker',
    description: 'Logged metrics for 4 consecutive weeks',
    icon: '📈',
    category: 'metrics',
  },
  
  // Documents
  FIRST_UPLOAD: {
    id: 'first_upload',
    name: 'Document Pro',
    description: 'Uploaded your first document',
    icon: '📄',
    category: 'documents',
  },
  
  // High scores
  PERFECT_SCORE: {
    id: 'perfect_score',
    name: 'Perfect 10',
    description: 'Achieved a perfect 10/10 overall score on a check-in',
    icon: '💯',
    category: 'checkin',
  },
  HIGH_SCORER: {
    id: 'high_scorer',
    name: 'High Achiever',
    description: 'Maintained an average score of 8+ for 4 weeks',
    icon: '⭐',
    category: 'checkin',
  },
};

export const achievementsRouter = router({
  // Get all achievements for a client
  getMyAchievements: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    const database = await db();
    
    // Get client protocol for this user
    const [protocol] = await database
      .select()
      .from(clientProtocols)
      .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${ctx.user!.email || ''})`);
    
    if (!protocol) return [];
    
    const achievements = await database
      .select()
      .from(clientAchievements)
      .where(eq(clientAchievements.clientProtocolId, protocol.id))
      .orderBy(sql`${clientAchievements.earnedAt} DESC`);
    
    // Map to include achievement details
    return achievements.map(a => ({
      ...a,
      details: ACHIEVEMENTS[a.achievementType as keyof typeof ACHIEVEMENTS] || {
        id: a.achievementType,
        name: a.title,
        description: a.description || '',
        icon: '🏅',
        category: 'other',
      },
    }));
  }),
  
  // Get all available achievements with earned status
  getAllAchievements: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    const database = await db();
    
    // Get client protocol for this user
    const [protocol] = await database
      .select()
      .from(clientProtocols)
      .where(sql`LOWER(${clientProtocols.clientEmail}) = LOWER(${ctx.user!.email || ''})`);
    
    if (!protocol) {
      return Object.values(ACHIEVEMENTS).map(achievement => ({
        ...achievement,
        earned: false,
        earnedAt: null,
      }));
    }
    
    const earned = await database
      .select()
      .from(clientAchievements)
      .where(eq(clientAchievements.clientProtocolId, protocol.id));
    
    const earnedIds = new Set(earned.map(a => a.achievementType));
    
    return Object.values(ACHIEVEMENTS).map(achievement => ({
      ...achievement,
      earned: earnedIds.has(achievement.id),
      earnedAt: earned.find(e => e.achievementType === achievement.id)?.earnedAt || null,
    }));
  }),
  
  // Check and award achievements (called after check-in submission, etc.)
  checkAndAward: protectedProcedure
    .input(z.object({
      clientProtocolId: z.number(),
    }))
    .mutation(async ({ input }: { input: { clientProtocolId: number } }) => {
      const database = await db();
      const newAchievements: string[] = [];
      
      // Get existing achievements
      const existing = await database
        .select()
        .from(clientAchievements)
        .where(eq(clientAchievements.clientProtocolId, input.clientProtocolId));
      
      const earnedIds = new Set(existing.map(a => a.achievementType));
      
      // Helper to award achievement
      const award = async (achievementId: string, streakCount?: number) => {
        if (earnedIds.has(achievementId)) return;
        
        const achievementDef = ACHIEVEMENTS[achievementId as keyof typeof ACHIEVEMENTS];
        if (!achievementDef) return;
        
        await database.insert(clientAchievements).values({
          clientProtocolId: input.clientProtocolId,
          achievementType: achievementId,
          title: achievementDef.name,
          description: achievementDef.description,
          earnedAt: new Date(),
          streakCount: streakCount || null,
        });
        
        newAchievements.push(achievementId);
        earnedIds.add(achievementId);
      };
      
      // Check check-in achievements
      const checkinCount = await database
        .select({ count: count() })
        .from(checkins)
        .where(and(
          eq(checkins.clientProtocolId, input.clientProtocolId),
          eq(checkins.status, 'submitted')
        ));
      
      const totalCheckins = checkinCount[0]?.count || 0;
      
      if (totalCheckins >= 1) await award('first_checkin');
      if (totalCheckins >= 4) await award('checkin_streak_4', 4);
      if (totalCheckins >= 8) await award('checkin_streak_8', 8);
      if (totalCheckins >= 12) await award('checkin_streak_12', 12);
      
      // Check for perfect score
      const perfectScores = await database
        .select()
        .from(checkins)
        .where(and(
          eq(checkins.clientProtocolId, input.clientProtocolId),
          eq(checkins.overallScore, 10)
        ));
      
      if (perfectScores.length > 0) await award('perfect_score');
      
      // Check metrics achievements
      const metricsCount = await database
        .select({ count: count() })
        .from(clientMetrics)
        .where(eq(clientMetrics.clientProtocolId, input.clientProtocolId));
      
      if ((metricsCount[0]?.count || 0) >= 1) await award('first_metrics');
      if ((metricsCount[0]?.count || 0) >= 4) await award('metrics_streak_4', 4);
      
      // Check document achievements
      const docCount = await database
        .select({ count: count() })
        .from(documents)
        .where(and(
          eq(documents.clientProtocolId, input.clientProtocolId),
          eq(documents.uploadedBy, 'client')
        ));
      
      if ((docCount[0]?.count || 0) >= 1) await award('first_upload');
      
      return {
        newAchievements: newAchievements.map(id => 
          ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS] || { id, name: id, icon: '🏅' }
        ),
      };
    }),
  
  // Admin: Get achievements for a specific client
  getClientAchievements: adminProcedure
    .input(z.object({
      clientProtocolId: z.number(),
    }))
    .query(async ({ input }: { input: { clientProtocolId: number } }) => {
      const database = await db();
      
      const achievements = await database
        .select()
        .from(clientAchievements)
        .where(eq(clientAchievements.clientProtocolId, input.clientProtocolId))
        .orderBy(sql`${clientAchievements.earnedAt} DESC`);
      
      return achievements.map(a => ({
        ...a,
        details: ACHIEVEMENTS[a.achievementType as keyof typeof ACHIEVEMENTS] || {
          id: a.achievementType,
          name: a.title,
          description: a.description || '',
          icon: '🏅',
          category: 'other',
        },
      }));
    }),
});
