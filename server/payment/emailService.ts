import nodemailer from "nodemailer";
import {
  generatePaymentConfirmationHTML,
  generatePaymentConfirmationText,
  PaymentConfirmationData,
} from "../emailTemplates/paymentConfirmation";
import { getSiteSetting } from '../db';

const getTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("SMTP not configured. Email sending will be simulated.");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort || "587"),
    secure: smtpPort === "465",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

/**
 * Send payment confirmation email to client
 */
export async function sendPaymentConfirmationEmail(
  data: PaymentConfirmationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if payment confirmation notifications are enabled
    const setting = await getSiteSetting('notification_payment_confirmation');
    if (setting === 'false') {
      console.log('[Email] Payment confirmation notification is disabled, skipping email');
      return { success: true, error: 'Email skipped - notification disabled in settings' };
    }

    const htmlContent = generatePaymentConfirmationHTML(data);
    const textContent = generatePaymentConfirmationText(data);
    const transporter = getTransporter();
    const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";

    if (!transporter) {
      console.log("=== SIMULATED PAYMENT CONFIRMATION EMAIL ===");
      console.log(`To: ${data.clientEmail}`);
      console.log(`Subject: Payment Confirmation - ${data.protocolName}`);
      console.log(`Amount: ${data.currency} ${data.amount}`);
      console.log(`Payment Method: ${data.paymentMethod}`);
      console.log("==========================================");
      return {
        success: true,
        error: "SMTP not configured - email simulated",
      };
    }

    const result = await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to: data.clientEmail,
      subject: `Payment Confirmation - ${data.protocolName}`,
      html: htmlContent,
      text: textContent,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("Error sending payment confirmation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

import {
  generateStoreOrderConfirmationHTML,
  generateStoreOrderConfirmationText,
  StoreOrderConfirmationData,
} from "../emailTemplates/storeOrderConfirmation";

/**
 * Send store order confirmation email to customer
 */
export async function sendStoreOrderConfirmationEmail(
  data: StoreOrderConfirmationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const htmlContent = generateStoreOrderConfirmationHTML(data);
    const textContent = generateStoreOrderConfirmationText(data);
    const transporter = getTransporter();
    const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";

    if (!transporter) {
      console.log("=== SIMULATED STORE ORDER CONFIRMATION EMAIL ===");
      console.log(`To: ${data.customerEmail}`);
      console.log(`Subject: Order Confirmation #${data.orderId} - Omega Store`);
      console.log(`Total: $${data.total}`);
      console.log(`Payment Method: ${data.paymentMethod}`);
      console.log(`Items: ${data.items.map(i => `${i.name} x${i.quantity}`).join(", ")}`);
      console.log("=================================================");
      return {
        success: true,
        error: "SMTP not configured - email simulated",
      };
    }

    const result = await transporter.sendMail({
      from: `"Omega Store" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to: data.customerEmail,
      subject: `Order Confirmation #${data.orderId} - Omega Store`,
      html: htmlContent,
      text: textContent,
    });

    console.log(`[Store Email] Order confirmation sent to ${data.customerEmail} for order #${data.orderId}`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("Error sending store order confirmation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

import { getAdminEmails, getUserEnabledEmailNotificationTypes } from '../db';
import { logEmailSentToHistory } from '../emailService';

export interface AdminPaymentNotificationData {
  clientName: string;
  clientEmail: string;
  amount: string;
  currency: string;
  paymentMethod: "paypal" | "venmo" | "cc" | "other";
  protocolId: number;
  protocolName: string;
  orderId?: string;
  feeAmount?: string | null;
  netAmount?: string | null;
  paymentDate: Date;
}

/**
 * Send payment received notification email to admin users who have "payment_received" email enabled
 */
export async function sendAdminPaymentReceivedEmail(
  data: AdminPaymentNotificationData
): Promise<{ success: boolean; sentTo: string[]; error?: string }> {
  try {
    // Get all admin emails
    const allAdminEmails = await getAdminEmails();
    if (allAdminEmails.length === 0) {
      console.log('[AdminPaymentEmail] No admin emails found');
      return { success: true, sentTo: [], error: 'No admin emails configured' };
    }

    // Filter admins who have payment_received email notifications enabled
    const { getUserByEmail } = await import('../db');
    const enabledAdminEmails: string[] = [];
    
    for (const email of allAdminEmails) {
      try {
        const user = await getUserByEmail(email);
        if (user) {
          const enabledTypes = await getUserEnabledEmailNotificationTypes(user.id);
          if (enabledTypes.includes('payment_received')) {
            enabledAdminEmails.push(email);
          }
        }
      } catch (e) {
        // If we can't check preferences, include admin by default
        enabledAdminEmails.push(email);
      }
    }

    if (enabledAdminEmails.length === 0) {
      console.log('[AdminPaymentEmail] No admins have payment_received email notifications enabled');
      return { success: true, sentTo: [], error: 'No admins have payment_received email enabled' };
    }

    const transporter = getTransporter();
    const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@omegalongevity.com>";
    const siteUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
    
    const methodLabel = data.paymentMethod === 'paypal' ? 'PayPal' 
      : data.paymentMethod === 'venmo' ? 'Venmo' 
      : data.paymentMethod === 'cc' ? 'Credit Card' 
      : 'Other';

    const formattedDate = data.paymentDate.toLocaleDateString('en-US', { timeZone: 'America/Denver',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const subject = `💰 Payment Received - ${data.clientName} ($${parseFloat(data.amount).toLocaleString('en-US', { timeZone: 'America/Denver' })})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px 30px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">💰 Payment Received!</h1>
            <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">A new payment has been processed</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 14px; width: 140px;">Client</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-weight: bold; font-size: 14px;">${data.clientName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 14px;">Email</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">
                  <a href="mailto:${data.clientEmail}" style="color: #2563eb; text-decoration: none;">${data.clientEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 14px;">Protocol</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${data.protocolName} (#${data.protocolId})</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 14px;">Amount</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-weight: bold; font-size: 18px; color: #059669;">$${parseFloat(data.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              ${data.feeAmount ? `
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 14px;">Processing Fee</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #dc2626;">-$${parseFloat(data.feeAmount).toFixed(2)}</td>
              </tr>
              ` : ''}
              ${data.netAmount ? `
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 14px;">Net Amount</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-weight: bold; font-size: 14px; color: #059669;">$${parseFloat(data.netAmount).toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 14px;">Payment Method</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${methodLabel}</td>
              </tr>
              ${data.orderId ? `
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 14px;">Transaction ID</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 13px; font-family: monospace; color: #6b7280;">${data.orderId}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Date</td>
                <td style="padding: 12px 16px; font-size: 14px;">${formattedDate}</td>
              </tr>
            </table>
            
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #166534; margin: 0; font-size: 14px;">
                ✅ A payment confirmation email has been sent to the client. A packing slip has been automatically created for fulfillment.
              </p>
            </div>
            
            <a href="${siteUrl}/admin/payment-history" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px;">
              View Payment History →
            </a>
          </div>
          
          <!-- Footer -->
          <div style="padding: 16px 30px; background-color: #f9fafb; border-top: 1px solid #f0f0f0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This is an automated notification from your Omega Longevity admin dashboard. 
              You can manage email notification preferences in Admin → Email & Notifications → Notification Settings.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!transporter) {
      console.log("=== SIMULATED ADMIN PAYMENT NOTIFICATION EMAIL ===");
      console.log(`To: ${enabledAdminEmails.join(', ')}`);
      console.log(`Subject: ${subject}`);
      console.log(`Client: ${data.clientName} (${data.clientEmail})`);
      console.log(`Amount: $${data.amount} via ${methodLabel}`);
      console.log("=================================================");
      return { success: true, sentTo: enabledAdminEmails, error: "SMTP not configured - email simulated" };
    }

    const sentTo: string[] = [];
    for (const adminEmail of enabledAdminEmails) {
      try {
        // Auto-inject email tracking
        let trackedHtml = htmlContent;
        try {
          const { createEmailTracking, injectTrackingIntoHtml } = await import('../emailTracking');
          const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
          const tid = await createEmailTracking({
            emailType: 'sendAdminPaymentReceivedEmail',
            recipientEmail: adminEmail,
            recipientName: undefined,
            subject: subject,
          });
          trackedHtml = injectTrackingIntoHtml(htmlContent, tid, baseUrl);
        } catch (_e) { /* tracking failed, send without */ }

        await transporter.sendMail({
          from: `"Omega Longevity System" <${smtpFrom}>`,
          to: adminEmail,
          subject,
          html: trackedHtml,
        });

        logEmailSentToHistory({
          recipientEmail: adminEmail,
          recipientName: undefined,
          subject: subject,
          category: 'payment',
          notificationType: 'payment_received_admin',
          status: 'sent',
        });

        sentTo.push(adminEmail);
        console.log(`[AdminPaymentEmail] Payment notification sent to ${adminEmail}`);
      } catch (emailErr) {
        console.error(`[AdminPaymentEmail] Failed to send to ${adminEmail}:`, emailErr);
      }
    }

    return { success: true, sentTo };
  } catch (error) {
    console.error("[AdminPaymentEmail] Error sending admin payment notification:", error);
    return {
      success: false,
      sentTo: [],
      error: error instanceof Error ? error.message : "Failed to send admin notification",
    };
  }
}
