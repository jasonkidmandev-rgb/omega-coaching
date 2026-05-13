import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Tests for autosave functionality in Protocol Section editors.
 * 
 * These tests verify:
 * 1. All 3 protocol section components have autosave logic
 * 2. Debounce timer is set to 5 seconds (reduced from 2s for server load)
 * 3. Autosave timer is cleaned up on unmount
 * 4. Manual save cancels pending autosave
 * 5. SaveStatusIndicator component shows save status
 * 6. Hydration guards prevent autosave on initial content load
 * 7. User-edit tracking prevents autosave without real edits
 */

const PROTOCOL_SECTION_FILES = [
  "client/src/components/protocol-sections/CompleteProgramGuide.tsx",
  "client/src/components/protocol-sections/PeriodizationOverview.tsx",
  "client/src/components/protocol-sections/TrainingSplitOverview.tsx",
];

describe("Protocol Section Autosave", () => {
  const fileContents: Record<string, string> = {};

  beforeEach(() => {
    for (const file of PROTOCOL_SECTION_FILES) {
      const fullPath = path.join(process.cwd(), file);
      fileContents[file] = fs.readFileSync(fullPath, "utf-8");
    }
  });

  describe("CompleteProgramGuide", () => {
    const file = PROTOCOL_SECTION_FILES[0];

    it("should have autosaveTimerRef declared", () => {
      expect(fileContents[file]).toContain("autosaveTimerRef");
    });

    it("should have doAutosave function", () => {
      expect(fileContents[file]).toContain("const doAutosave = useCallback");
    });

    it("should debounce with 5 second delay", () => {
      expect(fileContents[file]).toContain("5000");
    });

    it("should have lastSaved state for status display", () => {
      expect(fileContents[file]).toContain("lastSaved");
      expect(fileContents[file]).toContain("setLastSaved");
    });

    it("should use SaveStatusIndicator component", () => {
      expect(fileContents[file]).toContain("SaveStatusIndicator");
      expect(fileContents[file]).toContain("isSaving={isSaving}");
    });

    it("should cancel autosave timer on manual save", () => {
      expect(fileContents[file]).toContain("clearTimeout(autosaveTimerRef.current)");
      const handleSaveSection = fileContents[file].substring(
        fileContents[file].indexOf("const handleSave = useCallback")
      );
      expect(handleSaveSection).toContain("clearTimeout(autosaveTimerRef.current)");
    });

    it("should flush autosave on unmount", () => {
      expect(fileContents[file]).toContain("Cleanup autosave timer on unmount");
    });

    it("should use tabContentsRef for autosave to avoid stale closures", () => {
      expect(fileContents[file]).toContain("tabContentsRef");
    });

    it("should have hydration guard to prevent autosave on initial load", () => {
      expect(fileContents[file]).toContain("isHydratingRef");
      expect(fileContents[file]).toContain("hasHydratedOnceRef");
    });

    it("should track user edits to prevent false autosaves", () => {
      expect(fileContents[file]).toContain("userHasEditedRef");
      expect(fileContents[file]).toContain("userHasEditedRef.current = true");
    });

    it("should only hydrate from server data once", () => {
      expect(fileContents[file]).toContain("!hasHydratedOnceRef.current");
      expect(fileContents[file]).toContain("hasHydratedOnceRef.current = true");
    });

    it("should have isSettingContentRef guard in TabContentEditor", () => {
      expect(fileContents[file]).toContain("isSettingContentRef");
      expect(fileContents[file]).toContain("if (isSettingContentRef.current) return");
    });

    it("should start isSettingContentRef as true to block initial onUpdate", () => {
      expect(fileContents[file]).toContain("useRef(true); // Start as true to block initial onUpdate");
    });

    it("should release isSettingContentRef guard after 500ms initialization", () => {
      // After editor initializes, the guard is released after 500ms
      expect(fileContents[file]).toContain("hasInitializedRef.current = true");
      const initSection = fileContents[file].substring(
        fileContents[file].indexOf("After editor initializes")
      );
      expect(initSection).toContain("isSettingContentRef.current = false");
    });

    it("should use onChangeRef pattern to avoid stale closure in onUpdate", () => {
      expect(fileContents[file]).toContain("onChangeRef");
      expect(fileContents[file]).toContain("onChangeRef.current(editor.getHTML())");
    });

    it("should detect template loads by tracking lastHydratedContentRef", () => {
      expect(fileContents[file]).toContain("lastHydratedContentRef");
      expect(fileContents[file]).toContain("isTemplateLoad");
    });
  });

  describe("PeriodizationOverview", () => {
    const file = PROTOCOL_SECTION_FILES[1];

    it("should have autosaveTimerRef declared", () => {
      expect(fileContents[file]).toContain("autosaveTimerRef");
    });

    it("should have doAutosave function", () => {
      expect(fileContents[file]).toContain("const doAutosave = useCallback");
    });

    it("should debounce with 5 second delay", () => {
      expect(fileContents[file]).toContain("5000");
    });

    it("should have lastSaved state for status display", () => {
      expect(fileContents[file]).toContain("lastSaved");
      expect(fileContents[file]).toContain("setLastSaved");
    });

    it("should use SaveStatusIndicator component", () => {
      expect(fileContents[file]).toContain("SaveStatusIndicator");
      expect(fileContents[file]).toContain("isSaving={isSaving}");
    });

    it("should cancel autosave timer on manual save", () => {
      const handleSaveSection = fileContents[file].substring(
        fileContents[file].indexOf("const handleSave = useCallback")
      );
      expect(handleSaveSection).toContain("clearTimeout(autosaveTimerRef.current)");
    });

    it("should flush autosave on unmount", () => {
      expect(fileContents[file]).toContain("Cleanup autosave timer on unmount");
    });

    it("should trigger autosave in onUpdate callback", () => {
      expect(fileContents[file]).toContain("doAutosave()");
    });

    it("should have hydration guard to prevent autosave on initial load", () => {
      expect(fileContents[file]).toContain("isHydratingRef");
      expect(fileContents[file]).toContain("hasHydratedOnceRef");
    });

    it("should track user edits to prevent false autosaves", () => {
      expect(fileContents[file]).toContain("userHasEditedRef");
      expect(fileContents[file]).toContain("userHasEditedRef.current = true");
    });

    it("should only hydrate from server data once", () => {
      expect(fileContents[file]).toContain("!hasHydratedOnceRef.current");
      expect(fileContents[file]).toContain("hasHydratedOnceRef.current = true");
    });
  });

  describe("TrainingSplitOverview", () => {
    const file = PROTOCOL_SECTION_FILES[2];

    it("should have autosaveTimerRef declared", () => {
      expect(fileContents[file]).toContain("autosaveTimerRef");
    });

    it("should have doAutosave function", () => {
      expect(fileContents[file]).toContain("const doAutosave = useCallback");
    });

    it("should debounce with 5 second delay", () => {
      expect(fileContents[file]).toContain("5000");
    });

    it("should have lastSaved state for status display", () => {
      expect(fileContents[file]).toContain("lastSaved");
      expect(fileContents[file]).toContain("setLastSaved");
    });

    it("should use SaveStatusIndicator component", () => {
      expect(fileContents[file]).toContain("SaveStatusIndicator");
      expect(fileContents[file]).toContain("isSaving={isSaving}");
    });

    it("should cancel autosave timer on manual save", () => {
      const handleSaveSection = fileContents[file].substring(
        fileContents[file].indexOf("const handleSave = useCallback")
      );
      expect(handleSaveSection).toContain("clearTimeout(autosaveTimerRef.current)");
    });

    it("should flush autosave on unmount", () => {
      expect(fileContents[file]).toContain("Cleanup autosave timer on unmount");
    });

    it("should use splitDataRef for autosave to avoid stale closures", () => {
      expect(fileContents[file]).toContain("splitDataRef");
    });

    it("should trigger autosave when phase data is updated", () => {
      const updatePhaseSection = fileContents[file].substring(
        fileContents[file].indexOf("const updatePhase =")
      );
      expect(updatePhaseSection).toContain("doAutosave()");
    });

    it("should have hydration guard to prevent autosave on initial load", () => {
      expect(fileContents[file]).toContain("isHydratingRef");
      expect(fileContents[file]).toContain("hasHydratedOnceRef");
    });

    it("should track user edits to prevent false autosaves", () => {
      expect(fileContents[file]).toContain("userHasEditedRef");
      expect(fileContents[file]).toContain("userHasEditedRef.current = true");
    });

    it("should only hydrate from server data once", () => {
      expect(fileContents[file]).toContain("!hasHydratedOnceRef.current");
      expect(fileContents[file]).toContain("hasHydratedOnceRef.current = true");
    });
  });

  describe("Consistency across all components", () => {
    it("all components should use 5 second debounce delay", () => {
      for (const file of PROTOCOL_SECTION_FILES) {
        const content = fileContents[file];
        expect(content).toContain("doAutosave()");
        expect(content).toContain("5000");
      }
    });

    it("all components should have cleanup on unmount", () => {
      for (const file of PROTOCOL_SECTION_FILES) {
        expect(fileContents[file]).toContain("Cleanup autosave timer on unmount");
      }
    });

    it("all components should use SaveStatusIndicator", () => {
      for (const file of PROTOCOL_SECTION_FILES) {
        expect(fileContents[file]).toContain("SaveStatusIndicator");
        expect(fileContents[file]).toContain("isSaving={isSaving}");
      }
    });

    it("all components should have hydration guards", () => {
      for (const file of PROTOCOL_SECTION_FILES) {
        expect(fileContents[file]).toContain("isHydratingRef");
        expect(fileContents[file]).toContain("hasHydratedOnceRef");
        expect(fileContents[file]).toContain("userHasEditedRef");
      }
    });

    it("all components should only hydrate once from server data", () => {
      for (const file of PROTOCOL_SECTION_FILES) {
        expect(fileContents[file]).toContain("!hasHydratedOnceRef.current");
      }
    });

    it("all components should check userHasEditedRef before autosaving", () => {
      for (const file of PROTOCOL_SECTION_FILES) {
        expect(fileContents[file]).toContain("if (!userHasEditedRef.current) return");
      }
    });

    it("all components should detect template loads", () => {
      for (const file of PROTOCOL_SECTION_FILES) {
        expect(fileContents[file]).toContain("lastHydratedContentRef");
        expect(fileContents[file]).toContain("isTemplateLoad");
      }
    });

    it("all components should reset userHasEditedRef on template load", () => {
      for (const file of PROTOCOL_SECTION_FILES) {
        expect(fileContents[file]).toContain("userHasEditedRef.current = false; // Reset since this is a fresh template");
      }
    });
  });
});
