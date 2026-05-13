import { describe, it, expect } from 'vitest';

describe('Google Places API Key', () => {
  it('should have VITE_GOOGLE_PLACES_API_KEY environment variable set', () => {
    // For client-side API keys, we just verify the env var exists
    // The actual API validation happens client-side when the Places API loads
    const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(typeof apiKey).toBe('string');
    // API keys typically start with 'AIza'
    expect(apiKey?.startsWith('AIza')).toBe(true);
  });

  it('should be a valid format Google API key', async () => {
    const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY;
    
    // Google API keys are typically 39 characters
    expect(apiKey?.length).toBeGreaterThanOrEqual(30);
    
    // Test the key by making a simple geocoding request
    // This validates the key format - referer-restricted keys will return REQUEST_DENIED
    // which is expected and acceptable for browser-only keys
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=${apiKey}`
    );
    
    const data = await response.json();
    
    // Accept either:
    // - OK/ZERO_RESULTS: Key works without restrictions
    // - REQUEST_DENIED with referer message: Key has domain restrictions (valid for browser use)
    const isValidUnrestricted = ['OK', 'ZERO_RESULTS'].includes(data.status);
    const isValidRefererRestricted = data.status === 'REQUEST_DENIED' && 
      data.error_message?.includes('referer restrictions');
    
    expect(isValidUnrestricted || isValidRefererRestricted).toBe(true);
  });
});
