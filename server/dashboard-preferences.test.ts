import { describe, it, expect } from "vitest";
import { DEFAULT_WIDGETS, DEFAULT_WIDGET_ORDER, DEFAULT_VISIBILITY } from "./settings/dashboardPreferencesRouter";

describe("Dashboard Preferences", () => {
  describe("Default Configuration", () => {
    it("should have 6 default widgets", () => {
      expect(DEFAULT_WIDGETS).toHaveLength(6);
    });

    // enrollmentPipeline was checked by the dashboard but missing from this list, so the
    // enrollment funnel and its overdue alert could never be switched off and never
    // appeared in the Customize panel. isWidgetVisible() treats an unknown key as visible,
    // which is why nothing looked broken. A bare length check would not have caught it.
    it("registers every widget the dashboard renders", () => {
      const keys = DEFAULT_WIDGETS.map(w => w.key);
      for (const required of [
        "myProtocol", "needsAttention", "clientOverview", "emailActivity",
        "enrollmentPipeline", "recentClients",
      ]) {
        expect(keys).toContain(required);
      }
    });

    it("should have all required widget properties", () => {
      DEFAULT_WIDGETS.forEach(widget => {
        expect(widget).toHaveProperty("key");
        expect(widget).toHaveProperty("label");
        expect(widget).toHaveProperty("description");
        expect(widget).toHaveProperty("defaultVisible");
        expect(typeof widget.key).toBe("string");
        expect(typeof widget.label).toBe("string");
        expect(typeof widget.description).toBe("string");
        expect(typeof widget.defaultVisible).toBe("boolean");
      });
    });

    it("should have unique widget keys", () => {
      const keys = DEFAULT_WIDGETS.map(w => w.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it("should have all widgets visible by default", () => {
      DEFAULT_WIDGETS.forEach(widget => {
        expect(widget.defaultVisible).toBe(true);
      });
    });

    it("should have correct widget order matching widget keys", () => {
      expect(DEFAULT_WIDGET_ORDER).toHaveLength(DEFAULT_WIDGETS.length);
      DEFAULT_WIDGET_ORDER.forEach((key, index) => {
        expect(key).toBe(DEFAULT_WIDGETS[index].key);
      });
    });

    it("should have visibility object with all widget keys", () => {
      const visibilityKeys = Object.keys(DEFAULT_VISIBILITY);
      expect(visibilityKeys).toHaveLength(DEFAULT_WIDGETS.length);
      DEFAULT_WIDGETS.forEach(widget => {
        expect(DEFAULT_VISIBILITY).toHaveProperty(widget.key);
        expect(DEFAULT_VISIBILITY[widget.key]).toBe(true);
      });
    });
  });

  describe("Widget Keys", () => {
    // 2026-08-04: the dashboard was restructured. todaysTasks, followUpEmails and
    // unmappedItems merged into needsAttention; protocolHub and quickActions became
    // small header buttons; the two email widgets became one condensed card.
    const expectedWidgets = [
      "myProtocol",
      "needsAttention",
      "clientOverview",
      "emailActivity",
      "enrollmentPipeline",
      "recentClients",
    ];

    it("should contain all expected widget keys", () => {
      expectedWidgets.forEach(key => {
        const widget = DEFAULT_WIDGETS.find(w => w.key === key);
        expect(widget).toBeDefined();
      });
    });

    // Asserting each label against a copy of the label proves nothing. The real risk is a
    // widget the page renders but nobody registered — which is what happened with
    // enrollmentPipeline. That check lives above in "registers every widget the dashboard
    // renders". This one guards the other direction: a registered widget the page dropped,
    // which would show a dead switch in the Customize panel.
    it("has no registered widget the dashboard no longer renders", () => {
      const keys = DEFAULT_WIDGETS.map(w => w.key);
      expect(keys.sort()).toEqual([...expectedWidgets].sort());
    });
  });

  describe("Visibility Toggle Logic", () => {
    it("should be able to toggle visibility for any widget", () => {
      const testVisibility = { ...DEFAULT_VISIBILITY };
      
      // Toggle myProtocol off
      testVisibility.myProtocol = false;
      expect(testVisibility.myProtocol).toBe(false);
      
      // Toggle it back on
      testVisibility.myProtocol = true;
      expect(testVisibility.myProtocol).toBe(true);
    });

    it("should preserve other widgets when toggling one", () => {
      const testVisibility = { ...DEFAULT_VISIBILITY };
      
      // Toggle one widget
      testVisibility.emailActivity = false;
      
      // Check others are unchanged
      expect(testVisibility.myProtocol).toBe(true);
      expect(testVisibility.needsAttention).toBe(true);
      expect(testVisibility.clientOverview).toBe(true);
    });
  });

  describe("Widget Order Logic", () => {
    it("should be able to reorder widgets", () => {
      const newOrder = [...DEFAULT_WIDGET_ORDER];
      
      // Move first widget to end
      const first = newOrder.shift();
      if (first) {
        newOrder.push(first);
      }
      
      expect(newOrder).toHaveLength(DEFAULT_WIDGET_ORDER.length);
      expect(newOrder[newOrder.length - 1]).toBe(DEFAULT_WIDGET_ORDER[0]);
    });

    it("should maintain all widgets after reorder", () => {
      const newOrder = [...DEFAULT_WIDGET_ORDER].reverse();
      
      // All original keys should still be present
      DEFAULT_WIDGET_ORDER.forEach(key => {
        expect(newOrder).toContain(key);
      });
    });
  });
});
