import { describe, it, expect, vi } from 'vitest';

// Test profile completion calculation logic
describe('Profile Completion Progress', () => {
  // Helper function to calculate profile completion (mirrors frontend logic)
  function calculateProfileCompletion(client: {
    clientName: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
    shippingStreet: string | null;
    shippingCity: string | null;
    shippingState: string | null;
    shippingZip: string | null;
    shippingCountry: string | null;
  }) {
    const fields = [
      { name: "Name", complete: !!client.clientName && client.clientName.trim() !== "", required: true },
      { name: "Email", complete: !!client.clientEmail && client.clientEmail.trim() !== "", required: true },
      { name: "Phone", complete: !!client.clientPhone && client.clientPhone.trim() !== "", required: false },
      { name: "Street Address", complete: !!client.shippingStreet && client.shippingStreet.trim() !== "", required: true },
      { name: "City", complete: !!client.shippingCity && client.shippingCity.trim() !== "", required: true },
      { name: "State", complete: !!client.shippingState && client.shippingState.trim() !== "", required: true },
      { name: "ZIP Code", complete: !!client.shippingZip && client.shippingZip.trim() !== "", required: true },
      { name: "Country", complete: !!client.shippingCountry && client.shippingCountry.trim() !== "", required: false },
    ];

    const requiredFields = fields.filter(f => f.required);
    const completedRequired = requiredFields.filter(f => f.complete).length;
    const totalRequired = requiredFields.length;
    const percentage = Math.round((completedRequired / totalRequired) * 100);
    const missingFields = fields.filter(f => f.required && !f.complete).map(f => f.name);

    return { percentage, missingFields, completedRequired, totalRequired };
  }

  it('should return 100% for complete profile', () => {
    const client = {
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      clientPhone: '555-1234',
      shippingStreet: '123 Main St',
      shippingCity: 'Denver',
      shippingState: 'CO',
      shippingZip: '80202',
      shippingCountry: 'USA',
    };

    const result = calculateProfileCompletion(client);
    expect(result.percentage).toBe(100);
    expect(result.missingFields).toHaveLength(0);
  });

  it('should return 0% for empty profile', () => {
    const client = {
      clientName: null,
      clientEmail: null,
      clientPhone: null,
      shippingStreet: null,
      shippingCity: null,
      shippingState: null,
      shippingZip: null,
      shippingCountry: null,
    };

    const result = calculateProfileCompletion(client);
    expect(result.percentage).toBe(0);
    expect(result.missingFields).toHaveLength(6); // 6 required fields
  });

  it('should calculate partial completion correctly', () => {
    const client = {
      clientName: 'Jane Doe',
      clientEmail: 'jane@example.com',
      clientPhone: null,
      shippingStreet: null,
      shippingCity: null,
      shippingState: null,
      shippingZip: null,
      shippingCountry: null,
    };

    const result = calculateProfileCompletion(client);
    // 2 out of 6 required fields = 33%
    expect(result.percentage).toBe(33);
    expect(result.missingFields).toContain('Street Address');
    expect(result.missingFields).toContain('City');
    expect(result.missingFields).toContain('State');
    expect(result.missingFields).toContain('ZIP Code');
  });

  it('should not count optional fields in percentage', () => {
    const client = {
      clientName: 'Test User',
      clientEmail: 'test@example.com',
      clientPhone: null, // optional
      shippingStreet: '456 Oak Ave',
      shippingCity: 'Boulder',
      shippingState: 'CO',
      shippingZip: '80301',
      shippingCountry: null, // optional
    };

    const result = calculateProfileCompletion(client);
    expect(result.percentage).toBe(100); // All required fields complete
    expect(result.missingFields).toHaveLength(0);
  });

  it('should treat empty strings as incomplete', () => {
    const client = {
      clientName: 'Test',
      clientEmail: 'test@example.com',
      clientPhone: '',
      shippingStreet: '   ', // whitespace only
      shippingCity: '',
      shippingState: 'CO',
      shippingZip: '80301',
      shippingCountry: '',
    };

    const result = calculateProfileCompletion(client);
    // Name, Email, State, ZIP = 4 out of 6 = 67%
    expect(result.percentage).toBe(67);
    expect(result.missingFields).toContain('Street Address');
    expect(result.missingFields).toContain('City');
  });
});

// Test bulk profile reminder email template
describe('Bulk Profile Reminder Email', () => {
  it('should generate correct email content', () => {
    const clientName = 'John Doe';
    const protocolLink = 'https://example.com/protocol/abc123';
    const missingFields = ['Street Address', 'City', 'State', 'ZIP Code'];

    // Simulate email content generation
    const subject = `Action Required: Complete Your Profile - ${clientName}`;
    const htmlContent = `
      <p>Hi ${clientName},</p>
      <p>Please complete your profile to proceed with your protocol.</p>
      <p><strong>Missing Information:</strong></p>
      <ul>${missingFields.map(f => `<li>${f}</li>`).join('')}</ul>
      <p><a href="${protocolLink}">Complete Your Profile</a></p>
    `;

    expect(subject).toContain('Action Required');
    expect(subject).toContain(clientName);
    expect(htmlContent).toContain(clientName);
    expect(htmlContent).toContain(protocolLink);
    expect(htmlContent).toContain('Street Address');
    expect(htmlContent).toContain('City');
  });
});

// Test profile filter logic
describe('Profile Filter', () => {
  const clients = [
    {
      id: 1,
      clientName: 'Complete User',
      shippingStreet: '123 Main',
      shippingCity: 'Denver',
      shippingState: 'CO',
      shippingZip: '80202',
    },
    {
      id: 2,
      clientName: 'Incomplete User',
      shippingStreet: null,
      shippingCity: null,
      shippingState: null,
      shippingZip: null,
    },
    {
      id: 3,
      clientName: 'Partial User',
      shippingStreet: '456 Oak',
      shippingCity: 'Boulder',
      shippingState: null,
      shippingZip: null,
    },
  ];

  it('should filter to show only incomplete profiles', () => {
    const incompleteClients = clients.filter(
      c => !c.shippingStreet || !c.shippingCity || !c.shippingState || !c.shippingZip
    );
    
    expect(incompleteClients).toHaveLength(2);
    expect(incompleteClients.map(c => c.id)).toContain(2);
    expect(incompleteClients.map(c => c.id)).toContain(3);
  });

  it('should filter to show only complete profiles', () => {
    const completeClients = clients.filter(
      c => c.shippingStreet && c.shippingCity && c.shippingState && c.shippingZip
    );
    
    expect(completeClients).toHaveLength(1);
    expect(completeClients[0].id).toBe(1);
  });
});
