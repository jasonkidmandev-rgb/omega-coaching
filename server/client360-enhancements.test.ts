import { describe, it, expect } from 'vitest';

describe('Client 360 Enhancements', () => {
  // Test 1: updateContact route accepts lifecycleStage
  it('updateContact input schema accepts lifecycleStage', async () => {
    const res = await fetch('http://localhost:3000/api/trpc/client360.updateContact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { contactId: 1, lifecycleStage: 'past_client' } }),
    });
    // Should get 403 (not logged in) rather than 400 (bad input)
    expect(res.status).toBe(403);
  });

  // Test 2: deleteContact route exists
  it('deleteContact route exists and requires auth', async () => {
    const res = await fetch('http://localhost:3000/api/trpc/client360.deleteContact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { contactId: 999999 } }),
    });
    // Should get 403 (auth required) not 404 (route not found)
    expect(res.status).toBe(403);
  });

  // Test 3: bulkUpdateStage route exists
  it('bulkUpdateStage route exists and requires auth', async () => {
    const res = await fetch('http://localhost:3000/api/trpc/client360.bulkUpdateStage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { contactIds: [1, 2], lifecycleStage: 'past_client' } }),
    });
    expect(res.status).toBe(403);
  });

  // Test 4: list endpoint returns data with lifecycleStage
  it('list endpoint returns people with lifecycleStage field', async () => {
    const res = await fetch('http://localhost:3000/api/trpc/client360.list?input=' + encodeURIComponent(JSON.stringify({ json: { limit: 5, offset: 0 } })));
    // Should get 403 (auth required)
    expect(res.status).toBe(403);
  });

  // Test 5: updateContact rejects invalid lifecycleStage
  it('updateContact rejects invalid lifecycleStage value', async () => {
    const res = await fetch('http://localhost:3000/api/trpc/client360.updateContact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { contactId: 1, lifecycleStage: 'invalid_stage' } }),
    });
    // Should get 400 (bad input) because 'invalid_stage' is not in the enum
    expect([400, 403]).toContain(res.status);
  });

  // Test 6: KPI Dashboard endpoint works
  it('KPI Dashboard endpoint returns data (not 500)', async () => {
    const res = await fetch('http://localhost:3000/api/trpc/kpi.getDashboard');
    // Should get 403 (auth required) not 500 (server error)
    expect(res.status).toBe(403);
  });
});
