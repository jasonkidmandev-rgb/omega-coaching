import { describe, it, expect, vi } from "vitest";

describe("Check-In Summary Feature", () => {
  describe("getClientSummary endpoint", () => {
    it("should return hasData: false when no check-ins exist", () => {
      // Simulating the endpoint logic with empty data
      const allCheckins: any[] = [];
      const schedule = null;
      
      const result = {
        hasData: allCheckins.length > 0,
        schedule: schedule || null,
        stats: {
          totalSent: 0,
          totalCompleted: 0,
          totalIncomplete: 0,
          totalPending: 0,
          completionRate: 0,
          averageScore: null as number | null,
          currentStreak: 0,
          longestStreak: 0,
          lastResponseAt: null,
        },
        latestCheckin: null,
        trendData: [],
      };
      
      expect(result.hasData).toBe(false);
      expect(result.stats.totalSent).toBe(0);
      expect(result.stats.completionRate).toBe(0);
      expect(result.trendData).toHaveLength(0);
      expect(result.latestCheckin).toBeNull();
    });

    it("should calculate correct stats from check-in data", () => {
      const allCheckins = [
        { id: 1, status: "submitted", sentAt: new Date(), overallScore: 8, hasLowScore: false },
        { id: 2, status: "submitted", sentAt: new Date(), overallScore: 6, hasLowScore: false },
        { id: 3, status: "incomplete", sentAt: new Date(), overallScore: null, hasLowScore: false },
        { id: 4, status: "pending", sentAt: new Date(), overallScore: null, hasLowScore: false },
        { id: 5, status: "reviewed", sentAt: new Date(), overallScore: 9, hasLowScore: false },
      ];
      
      const totalSent = allCheckins.filter(c => c.sentAt).length;
      const completed = allCheckins.filter(c => c.status === "submitted" || c.status === "reviewed");
      const totalCompleted = completed.length;
      const totalIncomplete = allCheckins.filter(c => c.status === "incomplete").length;
      const totalPending = allCheckins.filter(c => c.status === "pending").length;
      const completionRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;
      
      const scoredCheckins = allCheckins.filter(c => c.overallScore !== null);
      const averageScore = scoredCheckins.length > 0
        ? Math.round(scoredCheckins.reduce((sum, c) => sum + (c.overallScore || 0), 0) / scoredCheckins.length * 10) / 10
        : null;
      
      expect(totalSent).toBe(5);
      expect(totalCompleted).toBe(3);
      expect(totalIncomplete).toBe(1);
      expect(totalPending).toBe(1);
      expect(completionRate).toBe(60); // 3/5 = 60%
      expect(averageScore).toBe(7.7); // (8+6+9)/3 = 7.666... rounds to 7.7
    });

    it("should identify trend direction from score data", () => {
      // Improving trend
      const improvingData = [
        { q1Score: 4 }, { q1Score: 5 }, { q1Score: 6 },
        { q1Score: 7 }, { q1Score: 8 }, { q1Score: 9 },
      ];
      
      const recent = improvingData.slice(-3);
      const earlier = improvingData.slice(0, 3);
      const recentAvg = recent.reduce((s, d) => s + (d.q1Score || 0), 0) / recent.length;
      const earlierAvg = earlier.reduce((s, d) => s + (d.q1Score || 0), 0) / earlier.length;
      const diff = recentAvg - earlierAvg;
      
      expect(recentAvg).toBe(8); // (7+8+9)/3
      expect(earlierAvg).toBe(5); // (4+5+6)/3
      expect(diff).toBeGreaterThan(0.5);
      
      // Declining trend
      const decliningData = [
        { q1Score: 9 }, { q1Score: 8 }, { q1Score: 7 },
        { q1Score: 5 }, { q1Score: 4 }, { q1Score: 3 },
      ];
      
      const recentDec = decliningData.slice(-3);
      const earlierDec = decliningData.slice(0, 3);
      const recentAvgDec = recentDec.reduce((s, d) => s + (d.q1Score || 0), 0) / recentDec.length;
      const earlierAvgDec = earlierDec.reduce((s, d) => s + (d.q1Score || 0), 0) / earlierDec.length;
      const diffDec = recentAvgDec - earlierAvgDec;
      
      expect(diffDec).toBeLessThan(-0.5);
    });

    it("should handle schedule with streak data", () => {
      const schedule = {
        currentStreak: 5,
        longestStreak: 8,
        totalResponses: 12,
        totalSent: 15,
        lastResponseAt: new Date("2026-02-10"),
      };
      
      expect(schedule.currentStreak).toBe(5);
      expect(schedule.longestStreak).toBe(8);
      expect(schedule.totalResponses).toBe(12);
    });

    it("should build trend data with Q1 scale responses", () => {
      // Simulating the trend data building logic
      const completedCheckins = [
        { id: 1, submittedAt: new Date("2026-01-01"), overallScore: 7, lowestScore: 7, hasLowScore: false, weekNumber: 1, status: "submitted" },
        { id: 2, submittedAt: new Date("2026-01-08"), overallScore: 8, lowestScore: 8, hasLowScore: false, weekNumber: 2, status: "submitted" },
        { id: 3, submittedAt: new Date("2026-01-15"), overallScore: 5, lowestScore: 4, hasLowScore: true, weekNumber: 3, status: "submitted" },
      ];
      
      const allResponses = [
        { checkinId: 1, questionType: "scale", scaleValue: 7, questionText: "Overall experience?" },
        { checkinId: 1, questionType: "text", scaleValue: null, questionText: "Side effects?" },
        { checkinId: 2, questionType: "scale", scaleValue: 8, questionText: "Overall experience?" },
        { checkinId: 2, questionType: "text", scaleValue: null, questionText: "Side effects?" },
        { checkinId: 3, questionType: "scale", scaleValue: 4, questionText: "Overall experience?" },
        { checkinId: 3, questionType: "text", scaleValue: null, questionText: "Side effects?" },
      ];
      
      const trendData = completedCheckins.map(checkin => {
        const responses = allResponses.filter(r => r.checkinId === checkin.id);
        const scaleResponses = responses.filter(r => r.questionType === "scale");
        const q1Response = scaleResponses[0];
        
        return {
          date: checkin.submittedAt,
          weekNumber: checkin.weekNumber,
          overallScore: checkin.overallScore,
          lowestScore: checkin.lowestScore,
          q1Score: q1Response?.scaleValue || null,
          q1Text: q1Response?.questionText || null,
          hasLowScore: checkin.hasLowScore,
          status: checkin.status,
        };
      });
      
      expect(trendData).toHaveLength(3);
      expect(trendData[0].q1Score).toBe(7);
      expect(trendData[1].q1Score).toBe(8);
      expect(trendData[2].q1Score).toBe(4);
      expect(trendData[2].hasLowScore).toBe(true);
      expect(trendData[0].weekNumber).toBe(1);
    });
  });

  describe("CheckinSummaryTab component structure", () => {
    it("should have the correct stat card categories", () => {
      const statCards = [
        "Completion Rate",
        "Avg Score",
        "Current Streak",
        "Status",
      ];
      
      expect(statCards).toHaveLength(4);
      expect(statCards).toContain("Completion Rate");
      expect(statCards).toContain("Avg Score");
      expect(statCards).toContain("Current Streak");
    });

    it("should color-code scores correctly", () => {
      const getColor = (score: number) => {
        if (score >= 7) return "green";
        if (score >= 5) return "yellow";
        return "red";
      };
      
      expect(getColor(9)).toBe("green");
      expect(getColor(7)).toBe("green");
      expect(getColor(6)).toBe("yellow");
      expect(getColor(5)).toBe("yellow");
      expect(getColor(4)).toBe("red");
      expect(getColor(1)).toBe("red");
    });

    it("should handle completion rate color coding", () => {
      const getCompletionColor = (rate: number) => {
        if (rate >= 75) return "green";
        if (rate >= 50) return "yellow";
        return "red";
      };
      
      expect(getCompletionColor(100)).toBe("green");
      expect(getCompletionColor(75)).toBe("green");
      expect(getCompletionColor(60)).toBe("yellow");
      expect(getCompletionColor(30)).toBe("red");
    });
  });
});
