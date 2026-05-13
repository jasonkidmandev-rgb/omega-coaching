import { describe, it, expect } from "vitest";
import { DEFAULT_WIDGETS, DEFAULT_WIDGET_ORDER, DEFAULT_VISIBILITY } from "./settings/dashboardPreferencesRouter";

describe("Dashboard Preferences", () => {
  describe("Default Configuration", () => {
    it("should have 10 default widgets", () => {
      expect(DEFAULT_WIDGETS).toHaveLength(10);
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
    const expectedWidgets = [
      "myProtocol",
      "todaysTasks",
      "protocolHub",
      "clientOverview",
      "quickActions",
      "emailOpenRates",
      "emailClickRates",
      "followUpEmails",
      "unmappedItems",
      "recentClients",
    ];

    it("should contain all expected widget keys", () => {
      expectedWidgets.forEach(key => {
        const widget = DEFAULT_WIDGETS.find(w => w.key === key);
        expect(widget).toBeDefined();
      });
    });

    it("should have myProtocol widget for admin's own protocol", () => {
      const myProtocol = DEFAULT_WIDGETS.find(w => w.key === "myProtocol");
      expect(myProtocol).toBeDefined();
      expect(myProtocol?.label).toBe("My Protocol");
    });

    it("should have todaysTasks widget for task management", () => {
      const todaysTasks = DEFAULT_WIDGETS.find(w => w.key === "todaysTasks");
      expect(todaysTasks).toBeDefined();
      expect(todaysTasks?.label).toBe("Today's Tasks");
    });

    it("should have clientOverview widget for client statistics", () => {
      const clientOverview = DEFAULT_WIDGETS.find(w => w.key === "clientOverview");
      expect(clientOverview).toBeDefined();
      expect(clientOverview?.label).toBe("Client Overview");
    });

    it("should have email analytics widgets", () => {
      const emailOpenRates = DEFAULT_WIDGETS.find(w => w.key === "emailOpenRates");
      const emailClickRates = DEFAULT_WIDGETS.find(w => w.key === "emailClickRates");
      expect(emailOpenRates).toBeDefined();
      expect(emailClickRates).toBeDefined();
      expect(emailOpenRates?.label).toBe("Client Email Open Rates");
      expect(emailClickRates?.label).toBe("Client Click-Through Rates");
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
      testVisibility.emailOpenRates = false;
      
      // Check others are unchanged
      expect(testVisibility.myProtocol).toBe(true);
      expect(testVisibility.todaysTasks).toBe(true);
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
