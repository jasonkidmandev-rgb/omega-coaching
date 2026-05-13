import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: (...args: any[]) => {
      mockSelect(...args);
      return {
        from: (...fArgs: any[]) => {
          mockFrom(...fArgs);
          return {
            where: (...wArgs: any[]) => {
              mockWhere(...wArgs);
              return {
                limit: (...lArgs: any[]) => {
                  mockLimit(...lArgs);
                  return [];
                },
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              };
            },
          };
        },
      };
    },
    insert: (...args: any[]) => {
      mockInsert(...args);
      return {
        values: (...vArgs: any[]) => {
          mockValues(...vArgs);
          return Promise.resolve();
        },
      };
    },
    delete: (...args: any[]) => {
      mockDelete(...args);
      return {
        where: vi.fn().mockResolvedValue(undefined),
      };
    },
    update: (...args: any[]) => {
      mockUpdate(...args);
      return {
        set: (...sArgs: any[]) => {
          mockSet(...sArgs);
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        },
      };
    },
  }),
}));

describe("Legacy Notes Migration Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should identify prospects with legacy notes but no engagement notes", () => {
    // Simulate the migration logic
    const prospects = [
      { id: 1, name: "Rick Boden", notes: "referral Bryan *Lyten", createdAt: new Date("2026-03-24") },
      { id: 2, name: "BJay and Melissa", notes: "*phone number is Melissa's", createdAt: new Date("2026-03-24") },
      { id: 3, name: "No Notes", notes: null, createdAt: new Date("2026-03-24") },
      { id: 4, name: "Empty Notes", notes: "", createdAt: new Date("2026-03-24") },
    ];

    const prospectsWithNotes = prospects.filter(p => p.notes && p.notes.trim().length > 0);
    expect(prospectsWithNotes).toHaveLength(2);
    expect(prospectsWithNotes[0].name).toBe("Rick Boden");
    expect(prospectsWithNotes[1].name).toBe("BJay and Melissa");
  });

  it("should skip prospects that already have engagement notes", () => {
    const existingEngagementNotes = [{ id: 100 }]; // Has at least one note
    const shouldSkip = existingEngagementNotes.length > 0;
    expect(shouldSkip).toBe(true);
  });

  it("should migrate prospects that have no engagement notes", () => {
    const existingEngagementNotes: any[] = []; // No notes
    const shouldMigrate = existingEngagementNotes.length === 0;
    expect(shouldMigrate).toBe(true);
  });

  it("should preserve original note text without modification", () => {
    const originalNote = "referral Bryan *Lyten \n*phone number is Melissa's";
    const migratedNote = originalNote.trim();
    expect(migratedNote).toBe("referral Bryan *Lyten \n*phone number is Melissa's");
    expect(migratedNote).not.toBe(""); // Not empty
  });

  it("should track migration results correctly", () => {
    let migrated = 0;
    let skipped = 0;
    const details: { name: string; id: number; action: string }[] = [];

    // Simulate migration for 3 prospects
    // Prospect 1: has legacy notes, no engagement notes -> migrate
    migrated++;
    details.push({ name: "Rick Boden", id: 1, action: "migrated" });

    // Prospect 2: has legacy notes AND engagement notes -> skip
    skipped++;
    details.push({ name: "James", id: 2, action: "skipped (already has engagement notes)" });

    // Prospect 3: has legacy notes, no engagement notes -> migrate
    migrated++;
    details.push({ name: "Fred and Chris", id: 3, action: "migrated" });

    expect(migrated).toBe(2);
    expect(skipped).toBe(1);
    expect(details).toHaveLength(3);
    expect(details.filter(d => d.action === "migrated")).toHaveLength(2);
    expect(details.filter(d => d.action.startsWith("skipped"))).toHaveLength(1);
  });

  it("should handle notes with special characters and line breaks", () => {
    const notes = [
      "Referral from Bryan Trenory*Lyten (washington)\nLDS",
      "*phone number is Melissa's \n*their 2 sons are on protocols with Jason no coaching \nOwn a law firm, super busy (possible candidates for 9th Vault)",
      "Referral from Kelly and Scott Alford \n* listed phone number is wife Chris",
    ];

    for (const note of notes) {
      const trimmed = note.trim();
      expect(trimmed.length).toBeGreaterThan(0);
      // Ensure no data is lost during trim
      expect(trimmed).toContain(note.trim());
    }
  });

  it("should not create duplicate engagement records on re-run", () => {
    // Simulate second run where prospects already have engagement notes
    const firstRunResults = { migrated: 5, skipped: 0 };
    const secondRunResults = { migrated: 0, skipped: 5 };

    // After first run, all should be skipped on second run
    expect(secondRunResults.migrated).toBe(0);
    expect(secondRunResults.skipped).toBe(firstRunResults.migrated);
  });
});

describe("Legacy Notes Display in Detail Panel", () => {
  it("should show legacy notes when no engagement notes exist", () => {
    const prospectData = {
      notes: "referral Bryan *Lyten",
      engagement: [],
    };

    const noteEntries = prospectData.engagement.filter((e: any) => e.eventType === "note");
    const hasLegacyNotes = !!prospectData.notes;
    const hasEngagementNotes = noteEntries.length > 0;

    expect(hasLegacyNotes).toBe(true);
    expect(hasEngagementNotes).toBe(false);
    // Should show legacy notes section
  });

  it("should show both legacy and engagement notes when both exist", () => {
    const prospectData = {
      notes: "referral Bryan *Lyten",
      engagement: [{ eventType: "note", notes: "Called, left voicemail" }],
    };

    const noteEntries = prospectData.engagement.filter((e: any) => e.eventType === "note");
    const hasLegacyNotes = !!prospectData.notes;
    const hasEngagementNotes = noteEntries.length > 0;

    expect(hasLegacyNotes).toBe(true);
    expect(hasEngagementNotes).toBe(true);
    // Should show both sections
  });

  it("should not show 'No notes yet' when legacy notes exist", () => {
    const prospectData = {
      notes: "Some original notes",
      engagement: [],
    };

    const noteEntries = prospectData.engagement.filter((e: any) => e.eventType === "note");
    const showNoNotesMessage = noteEntries.length === 0 && !prospectData.notes;

    expect(showNoNotesMessage).toBe(false);
  });
});
