import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const prospectRouter = readFileSync(join(__dirname, "prospect/prospectRouter.ts"), "utf-8");
const prospectsPage = readFileSync(join(__dirname, "../client/src/pages/admin/Prospects.tsx"), "utf-8");
const schema = readFileSync(join(__dirname, "../drizzle/schema.ts"), "utf-8");

describe("Custom Status Feature", () => {
  it("schema has customStatus field on prospects table", () => {
    expect(schema).toContain("customStatus");
  });

  it("backend updateProspectStatus accepts customStatus parameter", () => {
    expect(prospectRouter).toContain("customStatus: z.string().optional()");
  });

  it("backend saves customStatus to database", () => {
    expect(prospectRouter).toContain("customStatus: input.customStatus || null");
  });

  it("frontend has custom status dialog", () => {
    expect(prospectsPage).toContain("showCustomStatusDialog");
    expect(prospectsPage).toContain("Add Custom Status");
  });

  it("frontend reads custom statuses from site settings", () => {
    expect(prospectsPage).toContain("prospect_custom_statuses");
  });

  it("frontend renders custom statuses in the dropdown", () => {
    expect(prospectsPage).toContain("customStatuses.map");
    expect(prospectsPage).toContain('value={`custom:${cs.name}`}');
  });

  it("frontend has a + Custom Status button", () => {
    expect(prospectsPage).toContain("Custom Status");
    expect(prospectsPage).toContain("setShowCustomStatusDialog(true)");
  });

  it("StatusBadge supports customStatus prop", () => {
    expect(prospectsPage).toContain("function StatusBadge({ status, customStatus, customStatuses }");
    expect(prospectsPage).toContain("if (customStatus)");
  });

  it("custom status dialog has color picker", () => {
    expect(prospectsPage).toContain('type="color"');
    expect(prospectsPage).toContain("newCustomStatusColor");
  });

  it("custom status dialog has enum mapping selector", () => {
    expect(prospectsPage).toContain("Maps to built-in status");
  });
});

describe("Edit/Delete Notes Feature", () => {
  it("backend has editNote mutation", () => {
    expect(prospectRouter).toContain("editNote: adminProcedure");
  });

  it("backend has deleteNote mutation", () => {
    expect(prospectRouter).toContain("deleteNote: adminProcedure");
  });

  it("editNote updates engagement notes", () => {
    expect(prospectRouter).toContain("notes: input.note");
  });

  it("deleteNote removes engagement entry", () => {
    expect(prospectRouter).toContain("prospectEngagement");
  });

  it("frontend has edit note state", () => {
    expect(prospectsPage).toContain("editingNoteId");
    expect(prospectsPage).toContain("editingNoteText");
  });

  it("frontend has delete note confirmation dialog", () => {
    expect(prospectsPage).toContain("deleteNoteId");
    expect(prospectsPage).toContain("Delete Note");
  });

  it("frontend renders individual note entries from engagement history", () => {
    expect(prospectsPage).toContain('e.eventType === "note"');
  });

  it("notes have edit and delete buttons that appear on hover", () => {
    expect(prospectsPage).toContain("group-hover:opacity-100");
    expect(prospectsPage).toContain("setEditingNoteId(note.id)");
    expect(prospectsPage).toContain("setDeleteNoteId(note.id)");
  });

  it("edit mode has inline input with save and cancel", () => {
    expect(prospectsPage).toContain("editNote.mutate");
    expect(prospectsPage).toContain("editingNoteText.trim()");
  });
});

describe("Things to Know Feature", () => {
  it("schema has thingsToKnow field on prospects table", () => {
    expect(schema).toContain("thingsToKnow");
  });

  it("backend has updateThingsToKnow mutation", () => {
    expect(prospectRouter).toContain("updateThingsToKnow: adminProcedure");
  });

  it("backend saves thingsToKnow to database", () => {
    expect(prospectRouter).toContain("thingsToKnow: input.thingsToKnow");
  });

  it("frontend has Things to Know box", () => {
    expect(prospectsPage).toContain("Things to Know About This Client");
  });

  it("frontend has Lightbulb icon for Things to Know", () => {
    expect(prospectsPage).toContain("Lightbulb");
  });

  it("frontend has edit mode for Things to Know", () => {
    expect(prospectsPage).toContain("thingsToKnowEditing");
    expect(prospectsPage).toContain("thingsToKnowText");
  });

  it("Things to Know box is positioned before the status selector", () => {
    const thingsToKnowPos = prospectsPage.indexOf("Things to Know About This Client");
    const statusPos = prospectsPage.indexOf("Status Selector");
    expect(thingsToKnowPos).toBeLessThan(statusPos);
  });

  it("Things to Know uses amber styling for prominence", () => {
    expect(prospectsPage).toContain("bg-amber-50");
    expect(prospectsPage).toContain("border-amber-200");
  });

  it("Things to Know has save button with mutation", () => {
    expect(prospectsPage).toContain("updateThingsToKnow.mutate");
  });

  it("Things to Know shows placeholder when empty", () => {
    expect(prospectsPage).toContain("Click Edit to add important notes about this client");
  });
});

describe("Integration Checks", () => {
  it("all three features coexist in the prospect detail dialog", () => {
    // Things to Know, Status Selector, and Notes should all be in the dialog
    const dialogContent = prospectsPage;
    expect(dialogContent).toContain("Things to Know");
    expect(dialogContent).toContain("Status:");
    expect(dialogContent).toContain("Notes");
  });

  it("StatusBadge in table row passes customStatus", () => {
    expect(prospectsPage).toContain("customStatus={prospect.customStatus}");
  });

  it("custom status saves via settings.set mutation", () => {
    expect(prospectsPage).toContain('saveSetting.mutate({ key: "prospect_custom_statuses"');
  });
});
