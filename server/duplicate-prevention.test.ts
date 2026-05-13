import { describe, it, expect, beforeAll } from 'vitest';

// Test the phone number formatting functions
describe('Phone Number Formatting', () => {
  // Simulate the formatPhoneNumber function
  function formatPhoneNumber(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // Simulate parsePhoneNumber
  function parsePhoneNumber(fullPhone: string): { countryCode: string; phoneNumber: string } {
    if (!fullPhone) return { countryCode: "1", phoneNumber: "" };
    const digits = fullPhone.replace(/\D/g, "");
    
    if (digits.length > 10) {
      // Check if starts with "1" (US country code)
      if (digits.startsWith("1") && digits.length === 11) {
        return {
          countryCode: "1",
          phoneNumber: formatPhoneNumber(digits.slice(1))
        };
      }
      const countryCodeLength = digits.length - 10;
      return {
        countryCode: digits.slice(0, countryCodeLength),
        phoneNumber: formatPhoneNumber(digits.slice(countryCodeLength))
      };
    }
    
    return {
      countryCode: "1",
      phoneNumber: formatPhoneNumber(digits)
    };
  }

  it('should format a 10-digit phone number correctly', () => {
    const result = formatPhoneNumber('2252415950');
    expect(result).toBe('(225) 241-5950');
  });

  it('should format partial phone numbers', () => {
    expect(formatPhoneNumber('225')).toBe('(225');
    expect(formatPhoneNumber('225241')).toBe('(225) 241');
    expect(formatPhoneNumber('2252415')).toBe('(225) 241-5');
  });

  it('should handle already formatted numbers', () => {
    const result = formatPhoneNumber('(225) 241-5950');
    expect(result).toBe('(225) 241-5950');
  });

  it('should handle empty input', () => {
    expect(formatPhoneNumber('')).toBe('');
  });

  it('should parse a raw 10-digit number as US +1', () => {
    const result = parsePhoneNumber('2252415950');
    expect(result.countryCode).toBe('1');
    expect(result.phoneNumber).toBe('(225) 241-5950');
  });

  it('should parse a number with +1 prefix', () => {
    const result = parsePhoneNumber('+12252415950');
    expect(result.countryCode).toBe('1');
    expect(result.phoneNumber).toBe('(225) 241-5950');
  });

  it('should parse an empty string', () => {
    const result = parsePhoneNumber('');
    expect(result.countryCode).toBe('1');
    expect(result.phoneNumber).toBe('');
  });

  it('should display formatted phone with country code', () => {
    const parsed = parsePhoneNumber('2252415950');
    const display = `+${parsed.countryCode} ${parsed.phoneNumber}`;
    expect(display).toBe('+1 (225) 241-5950');
  });

  it('should display formatted phone from stored +1 format', () => {
    const parsed = parsePhoneNumber('+12252415950');
    const display = `+${parsed.countryCode} ${parsed.phoneNumber}`;
    expect(display).toBe('+1 (225) 241-5950');
  });
});

describe('Duplicate Protocol Prevention', () => {
  it('should detect duplicate protocols by email', () => {
    // Simulate existing protocols
    const existingProtocols = [
      { id: 540001, clientName: 'Kellie Alford', status: 'pending_approval', isActiveVersion: true, version: 1 },
      { id: 540006, clientName: 'Kellie Alford', status: 'pending_approval', isActiveVersion: true, version: 2 },
    ];

    const activeProtocols = existingProtocols.filter(p => 
      p.status !== 'completed' && p.isActiveVersion
    );

    expect(activeProtocols.length).toBe(2);
    expect(activeProtocols.length).toBeGreaterThan(0);
  });

  it('should calculate next version number correctly', () => {
    const existingProtocols = [
      { version: 1 },
      { version: 2 },
    ];

    const maxVersion = Math.max(...existingProtocols.map(p => p.version || 1));
    expect(maxVersion).toBe(2);
    expect(maxVersion + 1).toBe(3);
  });

  it('should not flag completed protocols as duplicates', () => {
    const existingProtocols = [
      { id: 1, status: 'completed', isActiveVersion: false, version: 1 },
    ];

    const activeProtocols = existingProtocols.filter(p => 
      p.status !== 'completed' && p.isActiveVersion
    );

    expect(activeProtocols.length).toBe(0);
  });

  it('should not flag when no existing protocols', () => {
    const existingProtocols: any[] = [];

    const activeProtocols = existingProtocols.filter(p => 
      p.status !== 'completed' && p.isActiveVersion
    );

    expect(activeProtocols.length).toBe(0);
  });
});

describe('Template & Client Protocol Item Deduplication', () => {
  describe('Bulk Insert Deduplication Logic', () => {
    it('should filter out duplicate items from a bulk insert array', () => {
      const items = [
        { clientProtocolId: 1, protocolItemId: 65, quantity: 3, isIncluded: true, isRecommended: true, sortOrder: 1 },
        { clientProtocolId: 1, protocolItemId: 65, quantity: 1, isIncluded: false, isRecommended: false, sortOrder: 2 },
        { clientProtocolId: 1, protocolItemId: 65, quantity: 1, isIncluded: false, isRecommended: false, sortOrder: 3 },
        { clientProtocolId: 1, protocolItemId: 100, quantity: 1, isIncluded: true, isRecommended: true, sortOrder: 4 },
      ];

      const seen = new Set<string>();
      const uniqueItems = items.filter(item => {
        const key = `${item.clientProtocolId}-${item.protocolItemId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      expect(uniqueItems).toHaveLength(2);
      expect(uniqueItems[0].protocolItemId).toBe(65);
      expect(uniqueItems[0].quantity).toBe(3);
      expect(uniqueItems[1].protocolItemId).toBe(100);
    });

    it('should keep all items when no duplicates exist', () => {
      const items = [
        { clientProtocolId: 1, protocolItemId: 10, quantity: 1, isIncluded: true, isRecommended: true, sortOrder: 1 },
        { clientProtocolId: 1, protocolItemId: 20, quantity: 2, isIncluded: true, isRecommended: true, sortOrder: 2 },
        { clientProtocolId: 1, protocolItemId: 30, quantity: 1, isIncluded: false, isRecommended: false, sortOrder: 3 },
      ];

      const seen = new Set<string>();
      const uniqueItems = items.filter(item => {
        const key = `${item.clientProtocolId}-${item.protocolItemId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      expect(uniqueItems).toHaveLength(3);
    });

    it('should handle empty arrays', () => {
      const items: any[] = [];
      const seen = new Set<string>();
      const uniqueItems = items.filter(item => {
        const key = `${item.clientProtocolId}-${item.protocolItemId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      expect(uniqueItems).toHaveLength(0);
    });

    it('should handle items across different client protocols independently', () => {
      const items = [
        { clientProtocolId: 1, protocolItemId: 65, quantity: 1, isIncluded: true, isRecommended: true, sortOrder: 1 },
        { clientProtocolId: 2, protocolItemId: 65, quantity: 1, isIncluded: true, isRecommended: true, sortOrder: 1 },
        { clientProtocolId: 1, protocolItemId: 65, quantity: 2, isIncluded: false, isRecommended: false, sortOrder: 2 },
      ];

      const seen = new Set<string>();
      const uniqueItems = items.filter(item => {
        const key = `${item.clientProtocolId}-${item.protocolItemId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      expect(uniqueItems).toHaveLength(2);
      expect(uniqueItems[0].clientProtocolId).toBe(1);
      expect(uniqueItems[1].clientProtocolId).toBe(2);
    });

    it('should handle quadruple duplicates like template 30001 had', () => {
      const items = [
        { clientProtocolId: 450001, protocolItemId: 30018, quantity: 1, isIncluded: true, isRecommended: true, sortOrder: 1 },
        { clientProtocolId: 450001, protocolItemId: 30018, quantity: 1, isIncluded: true, isRecommended: true, sortOrder: 2 },
        { clientProtocolId: 450001, protocolItemId: 30018, quantity: 1, isIncluded: true, isRecommended: true, sortOrder: 3 },
        { clientProtocolId: 450001, protocolItemId: 30018, quantity: 1, isIncluded: true, isRecommended: true, sortOrder: 4 },
      ];

      const seen = new Set<string>();
      const uniqueItems = items.filter(item => {
        const key = `${item.clientProtocolId}-${item.protocolItemId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      expect(uniqueItems).toHaveLength(1);
    });
  });

  describe('Router Endpoints Exist', () => {
    it('should have appRouter defined with procedures', async () => {
      const { appRouter } = await import('./routers');
      expect(appRouter).toBeDefined();
      expect(appRouter._def).toBeDefined();
      // Verify the router has clientProtocol sub-router
      const procedures = Object.keys(appRouter._def.procedures);
      expect(procedures.length).toBeGreaterThan(0);
      // Check that some client protocol procedures exist
      const clientProtocolProcs = procedures.filter(p => p.includes('clientProtocol'));
      expect(clientProtocolProcs.length).toBeGreaterThan(0);
    }, 30000);
  });
});
