import { ENV } from "./server/_core/env";

console.log("=== PayPal Webhook Configuration Check ===\n");

// Check if PAYPAL_WEBHOOK_ID is set
const webhookId = process.env.PAYPAL_WEBHOOK_ID;
console.log("PAYPAL_WEBHOOK_ID:", webhookId ? `✅ Set (${webhookId.substring(0, 8)}...)` : "❌ NOT SET");

// Check PayPal credentials
console.log("PAYPAL_CLIENT_ID:", ENV.paypalClientId ? `✅ Set (${ENV.paypalClientId.substring(0, 8)}...)` : "❌ NOT SET");
console.log("PAYPAL_SECRET:", ENV.paypalSecret ? "✅ Set (hidden)" : "❌ NOT SET");

// Test access token
async function testPayPalConnection() {
  try {
    const auth = Buffer.from(
      `${ENV.paypalClientId}:${ENV.paypalSecret}`
    ).toString("base64");

    const response = await fetch("https://api.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (response.ok) {
      console.log("\nPayPal API Connection: ✅ SUCCESS");
      const data = await response.json();
      console.log("Access Token:", data.access_token ? `✅ Obtained (expires in ${data.expires_in}s)` : "❌ Failed");
      
      // If we have webhook ID, verify it exists
      if (webhookId && data.access_token) {
        console.log("\n=== Verifying Webhook Configuration ===");
        const webhookResponse = await fetch(`https://api.paypal.com/v1/notifications/webhooks/${webhookId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.access_token}`,
            "Content-Type": "application/json",
          },
        });
        
        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json();
          console.log("Webhook Status: ✅ VERIFIED");
          console.log("Webhook URL:", webhookData.url);
          console.log("Event Types:", webhookData.event_types?.map((e: any) => e.name).join(", ") || "All events");
        } else {
          const errorText = await webhookResponse.text();
          console.log("Webhook Status: ❌ NOT FOUND or INVALID");
          console.log("Error:", errorText);
        }
      }
    } else {
      const error = await response.text();
      console.log("\nPayPal API Connection: ❌ FAILED");
      console.log("Error:", error);
    }
  } catch (error) {
    console.log("\nPayPal API Connection: ❌ ERROR");
    console.log("Error:", error);
  }
}

testPayPalConnection();
