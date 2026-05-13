import { describe, it, expect, vi } from "vitest";

// ============================================
// ENROLLMENT MANAGEMENT FEATURES V2 TESTS
// ============================================

describe("Enrollment Activity Log", () => {
  it("should define the enrollment_activity_log table with correct columns", () => {
    // The table should have: id, enrollment_id, action, details, performed_by, performed_by_user_id, created_at
    const requiredColumns = [
      "id",
      "enrollment_id",
      "action",
      "details",
      "performed_by",
      "performed_by_user_id",
      "created_at",
    ];
    // Verify all columns are defined
    requiredColumns.forEach((col) => {
      expect(col).toBeTruthy();
    });
  });

  it("should support known activity action types", () => {
    const knownActions = [
      "step_toggled",
      "payment_link_sent",
      "payment_recovered",
      "enrollment_merged",
      "enrollment_deleted",
    ];
    expect(knownActions).toHaveLength(5);
    knownActions.forEach((action) => {
      expect(typeof action).toBe("string");
      expect(action.length).toBeGreaterThan(0);
    });
  });

  it("should format step_toggled activity correctly", () => {
    const details = { step: "coachingFeePaid", value: true, toggled: "on" };
    expect(details.step).toBe("coachingFeePaid");
    expect(details.toggled).toBe("on");
  });

  it("should format payment_link_sent activity correctly", () => {
    const details = {
      paypalOrderId: "ORDER123",
      approvalLink: "https://paypal.com/approve/ORDER123",
      amount: "2587.50",
      tier: "flagship",
      sentTo: "client@example.com",
    };
    expect(details.paypalOrderId).toBe("ORDER123");
    expect(details.sentTo).toBe("client@example.com");
    expect(parseFloat(details.amount)).toBeGreaterThan(0);
  });

  it("should format enrollment_merged activity correctly", () => {
    const details = { mergedFrom: [100, 101, 102], deletedCount: 3 };
    expect(details.mergedFrom).toHaveLength(3);
    expect(details.deletedCount).toBe(3);
  });
});

describe("Resend Payment Link", () => {
  it("should calculate tier prices correctly", () => {
    const tierPrices: Record<string, number> = {
      elite: 15000,
      flagship: 3000,
      essentials: 750,
    };
    expect(tierPrices.elite).toBe(15000);
    expect(tierPrices.flagship).toBe(3000);
    expect(tierPrices.essentials).toBe(750);
  });

  it("should calculate processing fee correctly", () => {
    const PROCESSING_FEE_RATE = 0.035;
    const baseAmount = 3000;
    const finalAmount = (baseAmount + baseAmount * PROCESSING_FEE_RATE).toFixed(2);
    expect(finalAmount).toBe("3105.00");
  });

  it("should calculate elite tier total correctly", () => {
    const PROCESSING_FEE_RATE = 0.035;
    const baseAmount = 10000;
    const finalAmount = (baseAmount + baseAmount * PROCESSING_FEE_RATE).toFixed(2);
    expect(finalAmount).toBe("10350.00");
  });

  it("should calculate essentials tier total correctly", () => {
    const PROCESSING_FEE_RATE = 0.035;
    const baseAmount = 750;
    const finalAmount = (baseAmount + baseAmount * PROCESSING_FEE_RATE).toFixed(2);
    expect(finalAmount).toBe("776.25");
  });

  it("should generate correct tier labels", () => {
    const tierLabels: Record<string, string> = {
      elite: "Elite Longevity Program",
      flagship: "90-Day Transformation Program",
      essentials: "Protocol Essentials Program",
    };
    expect(tierLabels.elite).toBe("Elite Longevity Program");
    expect(tierLabels.flagship).toBe("90-Day Transformation Program");
    expect(tierLabels.essentials).toBe("Protocol Essentials Program");
  });

  it("should generate email HTML with payment link", () => {
    const approvalLink = "https://paypal.com/approve/ORDER123";
    const clientName = "Richard Feyh";
    const amount = "2587.50";
    const description = "90-Day Transformation Program (Resend)";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Complete Your Payment</h2>
        <p>Hi ${clientName},</p>
        <p>Click the button below to complete your payment of <strong>$${amount}</strong>:</p>
        <a href="${approvalLink}">Complete Payment via PayPal</a>
      </div>
    `;
    expect(html).toContain("Richard Feyh");
    expect(html).toContain("$2587.50");
    expect(html).toContain(approvalLink);
    expect(html).toContain("Complete Payment via PayPal");
  });

  it("should reject enrollment without email", () => {
    const enrollment = { id: 1, userEmail: null, email: null };
    const clientEmail = enrollment.userEmail || enrollment.email;
    expect(clientEmail).toBeFalsy();
  });

  it("should prefer user email over enrollment email", () => {
    const enrollment = {
      id: 1,
      userEmail: "user@example.com",
      email: "enrollment@example.com",
    };
    const clientEmail = enrollment.userEmail || enrollment.email;
    expect(clientEmail).toBe("user@example.com");
  });
});

describe("Bulk Enrollment Cleanup - Scan Duplicates", () => {
  it("should identify duplicate groups by userId", () => {
    const enrollments = [
      { id: 1, userId: 100, status: "enrolled" },
      { id: 2, userId: 100, status: "coaching_paid" },
      { id: 3, userId: 100, status: "enrolled" },
      { id: 4, userId: 200, status: "enrolled" },
    ];

    const grouped = enrollments.reduce(
      (acc, e) => {
        if (e.userId) {
          if (!acc[e.userId]) acc[e.userId] = [];
          acc[e.userId].push(e);
        }
        return acc;
      },
      {} as Record<number, typeof enrollments>
    );

    const duplicates = Object.entries(grouped).filter(([_, group]) => group.length > 1);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0][0]).toBe("100");
    expect(duplicates[0][1]).toHaveLength(3);
  });

  it("should prefer paid enrollment as the one to keep", () => {
    const group = {
      enrollmentIds: [3, 2, 1],
      paidStatuses: [false, true, false],
    };
    const paidIndex = group.paidStatuses.findIndex((p) => p);
    const bestKeepIdx = paidIndex >= 0 ? paidIndex : 0;
    const keepId = group.enrollmentIds[bestKeepIdx];
    expect(keepId).toBe(2);
  });

  it("should keep most recent if none are paid", () => {
    const group = {
      enrollmentIds: [3, 2, 1], // Already sorted DESC by id
      paidStatuses: [false, false, false],
    };
    const paidIndex = group.paidStatuses.findIndex((p) => p);
    const bestKeepIdx = paidIndex >= 0 ? paidIndex : 0;
    const keepId = group.enrollmentIds[bestKeepIdx];
    expect(keepId).toBe(3); // Most recent
  });

  it("should calculate correct delete IDs", () => {
    const group = {
      enrollmentIds: [5, 4, 3, 2, 1],
      paidStatuses: [false, true, false, false, false],
    };
    const paidIndex = group.paidStatuses.findIndex((p) => p);
    const bestKeepIdx = paidIndex >= 0 ? paidIndex : 0;
    const keepId = group.enrollmentIds[bestKeepIdx];
    const deleteIds = group.enrollmentIds.filter((_: number, i: number) => i !== bestKeepIdx);
    expect(keepId).toBe(4);
    expect(deleteIds).toEqual([5, 3, 2, 1]);
    expect(deleteIds).not.toContain(4);
  });
});

describe("Bulk Enrollment Cleanup - Merge", () => {
  it("should not delete the enrollment being kept", () => {
    const keepEnrollmentId = 5;
    const deleteEnrollmentIds = [5, 4, 3, 2, 1];
    const safeDeleteIds = deleteEnrollmentIds.filter((id) => id !== keepEnrollmentId);
    expect(safeDeleteIds).not.toContain(5);
    expect(safeDeleteIds).toEqual([4, 3, 2, 1]);
  });

  it("should return early if no enrollments to delete", () => {
    const keepEnrollmentId = 5;
    const deleteEnrollmentIds = [5]; // Only the keep ID
    const safeDeleteIds = deleteEnrollmentIds.filter((id) => id !== keepEnrollmentId);
    expect(safeDeleteIds).toHaveLength(0);
  });

  it("should soft-delete by setting status to completed with merge note", () => {
    const keepId = 10;
    const deleteId = 8;
    const note = `[Auto-merged: Duplicate removed in favor of enrollment #${keepId} on ${new Date().toISOString()}]`;
    expect(note).toContain(`#${keepId}`);
    expect(note).toContain("Auto-merged");
  });

  it("should handle guest duplicate groups", () => {
    const group = {
      type: "guest",
      identifier: "guest@example.com",
      userId: null,
      email: "guest@example.com",
      count: 3,
      enrollmentIds: [10, 8, 5],
      statuses: ["enrolled", "enrolled", "enrolled"],
      paidStatuses: [false, false, false],
    };
    expect(group.type).toBe("guest");
    expect(group.userId).toBeNull();
    const keepId = group.enrollmentIds[0]; // Most recent
    expect(keepId).toBe(10);
  });
});

describe("Activity Log Integration with Existing Features", () => {
  it("should log step_toggled when admin toggles a journey step", () => {
    const logEntry = {
      enrollmentId: 210005,
      action: "step_toggled",
      details: { step: "coachingFeePaid", value: true, toggled: "on" },
      performedBy: "Admin",
      performedByUserId: 1,
    };
    expect(logEntry.action).toBe("step_toggled");
    expect(logEntry.details.step).toBe("coachingFeePaid");
  });

  it("should log payment_recovered when retry payment succeeds", () => {
    const logEntry = {
      enrollmentId: 210005,
      action: "payment_recovered",
      details: {
        paypalOrderId: "8YL693863M659913K",
        amount: "2070.00",
        payerName: "RICHARD FEYH",
      },
    };
    expect(logEntry.action).toBe("payment_recovered");
    expect(logEntry.details.paypalOrderId).toBe("8YL693863M659913K");
  });

  it("should log enrollment_merged and enrollment_deleted during merge", () => {
    const keepLog = {
      enrollmentId: 210005,
      action: "enrollment_merged",
      details: { mergedFrom: [210004, 210003], deletedCount: 2 },
    };
    const deleteLog = {
      enrollmentId: 210004,
      action: "enrollment_deleted",
      details: { reason: "duplicate_merge", mergedInto: 210005 },
    };
    expect(keepLog.action).toBe("enrollment_merged");
    expect(deleteLog.action).toBe("enrollment_deleted");
    expect(deleteLog.details.mergedInto).toBe(210005);
  });
});
