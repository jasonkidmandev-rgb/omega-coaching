import { describe, it, expect } from "vitest";
import { getRecommendation } from "@/components/PlanQuiz";

describe("PlanQuiz Recommendation Engine", () => {
  // ── Elite Support ──────────────────────────────────────────────
  describe("Elite support level", () => {
    it("recommends Functional Health Elite for functional_health + elite", () => {
      const rec = getRecommendation({ goal: "functional_health", experience: "new", support: "elite" });
      expect(rec.planKey).toBe("functional_health_elite");
      expect(rec.price).toBe(8500);
    });

    it("recommends Functional Health Elite for general + elite", () => {
      const rec = getRecommendation({ goal: "general", experience: "experienced", support: "elite" });
      expect(rec.planKey).toBe("functional_health_elite");
      expect(rec.price).toBe(8500);
    });

    it("recommends Elite Longevity for weight_loss + elite", () => {
      const rec = getRecommendation({ goal: "weight_loss", experience: "some", support: "elite" });
      expect(rec.planKey).toBe("elite");
      expect(rec.price).toBe(15000);
    });

    it("recommends Elite Longevity for anti_aging + elite", () => {
      const rec = getRecommendation({ goal: "anti_aging", experience: "new", support: "elite" });
      expect(rec.planKey).toBe("elite");
      expect(rec.price).toBe(15000);
    });

    it("recommends Elite Longevity for recovery + elite", () => {
      const rec = getRecommendation({ goal: "recovery", experience: "experienced", support: "elite" });
      expect(rec.planKey).toBe("elite");
      expect(rec.price).toBe(15000);
    });
  });

  // ── Coached Support ────────────────────────────────────────────
  describe("Coached support level", () => {
    it("recommends flagship for weight_loss + coached", () => {
      const rec = getRecommendation({ goal: "weight_loss", experience: "new", support: "coached" });
      expect(rec.planKey).toBe("flagship");
      expect(rec.price).toBe(2500);
    });

    it("recommends longevity for anti_aging + coached", () => {
      const rec = getRecommendation({ goal: "anti_aging", experience: "some", support: "coached" });
      expect(rec.planKey).toBe("longevity");
      expect(rec.price).toBe(2500);
    });

    it("recommends recovery for recovery + coached", () => {
      const rec = getRecommendation({ goal: "recovery", experience: "experienced", support: "coached" });
      expect(rec.planKey).toBe("recovery");
      expect(rec.price).toBe(2500);
    });

    it("recommends functional_health_elite for functional_health + coached", () => {
      const rec = getRecommendation({ goal: "functional_health", experience: "new", support: "coached" });
      expect(rec.planKey).toBe("functional_health_elite");
      expect(rec.price).toBe(8500);
    });

    it("recommends flagship for general + coached", () => {
      const rec = getRecommendation({ goal: "general", experience: "some", support: "coached" });
      expect(rec.planKey).toBe("flagship");
      expect(rec.price).toBe(2500);
    });

    it("provides different whyThisPlan for new vs experienced users", () => {
      const newUser = getRecommendation({ goal: "weight_loss", experience: "new", support: "coached" });
      const expUser = getRecommendation({ goal: "weight_loss", experience: "experienced", support: "coached" });
      expect(newUser.whyThisPlan).not.toBe(expUser.whyThisPlan);
      expect(newUser.whyThisPlan).toContain("new to peptides");
    });
  });

  // ── Self-Paced Support ─────────────────────────────────────────
  describe("Self-paced support level", () => {
    it("recommends coaching session for experienced + self_paced", () => {
      const rec = getRecommendation({ goal: "weight_loss", experience: "experienced", support: "self_paced" });
      expect(rec.planKey).toBe("coaching_60min");
      expect(rec.price).toBe(350);
    });

    it("recommends essentials for new + self_paced", () => {
      const rec = getRecommendation({ goal: "anti_aging", experience: "new", support: "self_paced" });
      expect(rec.planKey).toBe("essentials");
      expect(rec.price).toBe(750);
    });

    it("recommends essentials for some experience + self_paced", () => {
      const rec = getRecommendation({ goal: "recovery", experience: "some", support: "self_paced" });
      expect(rec.planKey).toBe("essentials");
      expect(rec.price).toBe(750);
    });

    it("provides different whyThisPlan for new vs some experience on essentials", () => {
      const newUser = getRecommendation({ goal: "weight_loss", experience: "new", support: "self_paced" });
      const someUser = getRecommendation({ goal: "weight_loss", experience: "some", support: "self_paced" });
      expect(newUser.whyThisPlan).not.toBe(someUser.whyThisPlan);
    });
  });

  // ── All combinations produce valid results ─────────────────────
  describe("All combinations produce valid recommendations", () => {
    const goals = ["weight_loss", "anti_aging", "recovery", "functional_health", "general"] as const;
    const experiences = ["new", "some", "experienced"] as const;
    const supports = ["self_paced", "coached", "elite"] as const;

    for (const goal of goals) {
      for (const experience of experiences) {
        for (const support of supports) {
          it(`produces valid result for ${goal} + ${experience} + ${support}`, () => {
            const rec = getRecommendation({ goal, experience, support });
            expect(rec.planKey).toBeTruthy();
            expect(rec.planName).toBeTruthy();
            expect(rec.price).toBeGreaterThan(0);
            expect(rec.tagline).toBeTruthy();
            expect(rec.benefits.length).toBeGreaterThanOrEqual(3);
            expect(rec.whyThisPlan).toBeTruthy();
          });
        }
      }
    }
  });
});
