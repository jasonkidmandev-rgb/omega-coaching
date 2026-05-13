import { describe, it, expect } from "vitest";

describe("Twilio Credentials Validation", () => {
  it("should have TWILIO_ACCOUNT_SID set", () => {
    expect(process.env.TWILIO_ACCOUNT_SID).toBeDefined();
    expect(process.env.TWILIO_ACCOUNT_SID).toMatch(/^AC/);
  });

  it("should have TWILIO_AUTH_TOKEN set", () => {
    expect(process.env.TWILIO_AUTH_TOKEN).toBeDefined();
    expect(process.env.TWILIO_AUTH_TOKEN!.length).toBeGreaterThan(10);
  });

  it("should have TWILIO_PHONE_NUMBER set", () => {
    expect(process.env.TWILIO_PHONE_NUMBER).toBeDefined();
    expect(process.env.TWILIO_PHONE_NUMBER).toMatch(/^\+1/);
  });

  it("should be able to authenticate with Twilio API", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;

    // Make a lightweight API call to verify credentials
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sid).toBe(accountSid);
    expect(data.status).toBe("active");
  });
});
