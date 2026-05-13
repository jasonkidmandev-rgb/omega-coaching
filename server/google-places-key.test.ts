import { describe, it, expect } from 'vitest';

describe('Google Places API Key Validation', () => {
  it('should have VITE_GOOGLE_PLACES_API_KEY set', () => {
    const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(apiKey!.length).toBeGreaterThan(10);
  });

  it('should be a valid Google API key format (starts with AIza)', () => {
    const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY;
    expect(apiKey).toMatch(/^AIza[A-Za-z0-9_-]{35}$/);
  });

  it('should successfully call Google Places API', async () => {
    const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY;
    // Use the Places Autocomplete endpoint to validate the key
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=123+Main+Street&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Valid statuses: OK (results found), ZERO_RESULTS (no results but key is valid)
    // Invalid key would return REQUEST_DENIED
    expect(data.status).not.toBe('REQUEST_DENIED');
    expect(['OK', 'ZERO_RESULTS']).toContain(data.status);
  });
});
