import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('TransformationVerify Sign-In Redirect', () => {
  const componentCode = readFileSync(
    join(__dirname, '../client/src/pages/TransformationVerify.tsx'),
    'utf-8'
  );

  it('should redirect to /login frontend page, not /api/auth/login API endpoint', () => {
    // The handleSignIn function should use the frontend login route
    expect(componentCode).toContain('/login?returnTo=');
    // Must NOT contain the broken API endpoint redirect
    expect(componentCode).not.toContain("window.location.href = `/api/auth/login");
  });

  it('should use returnTo parameter (matching Login.tsx convention)', () => {
    // Login.tsx reads "returnTo" from URL params, not "returnUrl"
    expect(componentCode).toContain('returnTo=');
    // Should NOT use returnUrl (that was the old broken param name)
    expect(componentCode).not.toMatch(/window\.location\.href.*returnUrl=/);
  });

  it('should include enrollmentId and token in the returnTo URL', () => {
    // The return URL should pass through the enrollment context
    expect(componentCode).toContain('enrollmentId=${enrollmentId}');
    expect(componentCode).toContain('token=${token}');
  });

  it('should include openIntake param when autoIntake is true', () => {
    expect(componentCode).toContain("autoIntake ? '&openIntake=true' : ''");
  });

  it('should not reference OAuth sign-in methods (Google/Microsoft/Apple)', () => {
    // Auth is now email+password, not OAuth
    expect(componentCode).not.toContain('Sign in with Google');
    expect(componentCode).not.toContain('Sign in with Microsoft');
    expect(componentCode).not.toContain('Sign in with Apple');
  });

  it('should have updated sign-in instruction text', () => {
    expect(componentCode).toContain('Sign in or create your account');
  });
});

describe('Email Template Verification URLs', () => {
  const emailServiceCode = readFileSync(
    join(__dirname, 'emailService.ts'),
    'utf-8'
  );

  it('should generate verification links to /transformation/verify (frontend route)', () => {
    // The email templates should link to the frontend verification page
    expect(emailServiceCode).toContain('/transformation/verify?token=');
  });

  it('should NOT generate links directly to /api/auth/login', () => {
    // Email templates should never link to API endpoints for browser navigation
    const emailLines = emailServiceCode.split('\n');
    const hrefLines = emailLines.filter(line => line.includes('href=') && line.includes('/api/auth/login'));
    expect(hrefLines.length).toBe(0);
  });
});

describe('Login.tsx returnTo parameter', () => {
  const loginCode = readFileSync(
    join(__dirname, '../client/src/pages/Login.tsx'),
    'utf-8'
  );

  it('should read returnTo from URL params', () => {
    expect(loginCode).toContain('urlParams.get("returnTo")');
  });

  it('should redirect to returnTo after successful login', () => {
    expect(loginCode).toContain('window.location.href = returnTo');
  });

  it('should use POST method for /api/auth/login (not GET)', () => {
    expect(loginCode).toContain('method: "POST"');
    expect(loginCode).toContain('fetch("/api/auth/login"');
  });
});
