import { describe, it, expect } from "vitest";

describe("Calendly API Token Validation", () => {
  it("should have CALENDLY_API_TOKEN set", () => {
    expect(process.env.CALENDLY_API_TOKEN).toBeDefined();
    expect(process.env.CALENDLY_API_TOKEN!.length).toBeGreaterThan(50);
  });

  it("should authenticate with Calendly API and get current user", async () => {
    const response = await fetch("https://api.calendly.com/users/me", {
      headers: {
        Authorization: `Bearer ${process.env.CALENDLY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resource).toBeDefined();
    expect(data.resource.uri).toBeDefined();
    expect(data.resource.name).toBeDefined();
    console.log(`Calendly user: ${data.resource.name} (${data.resource.email})`);
    console.log(`User URI: ${data.resource.uri}`);
    console.log(`Organization: ${data.resource.current_organization}`);
  });

  it("should be able to list event types", async () => {
    // First get user URI
    const userRes = await fetch("https://api.calendly.com/users/me", {
      headers: {
        Authorization: `Bearer ${process.env.CALENDLY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    const userData = await userRes.json();
    const userUri = userData.resource.uri;

    // Then list event types
    const response = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CALENDLY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.collection).toBeDefined();
    console.log(`Found ${data.collection.length} active event types:`);
    data.collection.forEach((et: any) => {
      console.log(`  - ${et.name} (${et.duration} min, ${et.kind})`);
    });
  });
});
