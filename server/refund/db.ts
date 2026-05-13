import { getDb } from "../db";
import { refundRequests } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function createRefundRequest(data: {
  protocolId: number;
  clientId: string;
  reason: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(refundRequests).values({
      protocolId: data.protocolId,
      clientId: data.clientId,
      reason: data.reason,
      status: (data.status as any) || "pending",
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return result;
  } catch (error) {
    console.error("Error creating refund request:", error);
    return null;
  }
}

export async function getRefundRequestsByClient(clientId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const requests = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.clientId, clientId));

    return requests;
  } catch (error) {
    console.error("Error fetching refund requests by client:", error);
    return [];
  }
}

export async function getAllRefundRequests(status?: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    if (status) {
      const requests = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.status, status as any));
      return requests;
    }

    const requests = await db.select().from(refundRequests);
    return requests;
  } catch (error) {
    console.error("Error fetching all refund requests:", error);
    return [];
  }
}

export async function updateRefundRequest(
  requestId: number,
  data: {
    status?: string;
    refundAmount?: string;
    adminNotes?: string;
    reviewedAt?: Date;
    processedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.status) updateData.status = data.status;
    if (data.refundAmount) updateData.refundAmount = data.refundAmount;
    if (data.adminNotes) updateData.adminNotes = data.adminNotes;
    if (data.reviewedAt) updateData.reviewedAt = data.reviewedAt;
    if (data.processedAt) updateData.processedAt = data.processedAt;

    const result = await db
      .update(refundRequests)
      .set(updateData)
      .where(eq(refundRequests.id, requestId));

    return result;
  } catch (error) {
    console.error("Error updating refund request:", error);
    return null;
  }
}

export async function getRefundRequestById(requestId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const request = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, requestId))
      .limit(1);

    return request[0] || null;
  } catch (error) {
    console.error("Error fetching refund request:", error);
    return null;
  }
}
