import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== PHASE 1: AUTH WORKFLOW TESTS ===\n");

// Test 1: Login endpoint with valid credentials
console.log("TEST 1: Login with valid admin credentials");
try {
  const resp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jason@kidmancorp.com', password: 'AdminTest123!' })
  });
  const data = await resp.json();
  console.log(`  Status: ${resp.status}, Success: ${data.success}, User: ${data.user?.name || 'N/A'}, Role: ${data.user?.role || 'N/A'}`);
  const cookies = resp.headers.get('set-cookie');
  console.log(`  Cookie set: ${cookies ? 'YES' : 'NO'}`);
  console.log(`  Has passwordHash in response: ${JSON.stringify(data).includes('passwordHash') ? 'FAIL - SECURITY ISSUE' : 'PASS'}`);
  
  // Extract cookie for session tests
  const sessionCookie = cookies?.match(/app_session_id=([^;]+)/)?.[1];
  
  // Test 2: Session persistence - auth.me with cookie
  console.log("\nTEST 2: Session persistence (auth.me with cookie)");
  const meResp = await fetch('http://localhost:3000/api/trpc/auth.me', {
    headers: { 'Cookie': `app_session_id=${sessionCookie}` }
  });
  const meData = await meResp.json();
  const user = meData?.result?.data;
  console.log(`  Status: ${meResp.status}, User returned: ${user ? 'YES' : 'NO'}, Name: ${user?.name || 'N/A'}`);
  console.log(`  Has passwordHash: ${JSON.stringify(meData).includes('passwordHash') ? 'FAIL - SECURITY ISSUE' : 'PASS'}`);
  
  // Test 3: Logout
  console.log("\nTEST 3: Logout");
  const logoutResp = await fetch('http://localhost:3000/api/trpc/auth.logout', {
    method: 'POST',
    headers: { 
      'Cookie': `app_session_id=${sessionCookie}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log(`  Status: ${logoutResp.status}`);
  
  // Test 4: auth.me after logout should return null
  console.log("\nTEST 4: Session invalidated after logout");
  const meAfterLogout = await fetch('http://localhost:3000/api/trpc/auth.me', {
    headers: { 'Cookie': `app_session_id=${sessionCookie}` }
  });
  const meAfterData = await meAfterLogout.json();
  const userAfter = meAfterData?.result?.data;
  console.log(`  User after logout: ${userAfter ? 'FAIL - Session not invalidated' : 'PASS - null'}`);
  
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

// Test 5: Login with wrong password
console.log("\nTEST 5: Login with wrong password");
try {
  const resp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jason@kidmancorp.com', password: 'WrongPassword123!' })
  });
  const data = await resp.json();
  console.log(`  Status: ${resp.status}, Error: ${data.error || 'none'}`);
  console.log(`  Result: ${resp.status === 401 ? 'PASS' : 'FAIL'}`);
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

// Test 6: Login with non-existent email
console.log("\nTEST 6: Login with non-existent email");
try {
  const resp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@example.com', password: 'Test123!' })
  });
  const data = await resp.json();
  console.log(`  Status: ${resp.status}, Error: ${data.error || 'none'}`);
  console.log(`  Result: ${resp.status === 401 ? 'PASS' : 'FAIL'}`);
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

// Test 7: Signup flow
console.log("\nTEST 7: Signup with new email");
try {
  const resp = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'audit-test@example.com', password: 'AuditTest123!', name: 'Audit Tester' })
  });
  const data = await resp.json();
  console.log(`  Status: ${resp.status}, Success: ${data.success}, User: ${data.user?.name || 'N/A'}`);
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

// Test 8: Duplicate signup prevention
console.log("\nTEST 8: Duplicate signup prevention");
try {
  const resp = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'audit-test@example.com', password: 'AuditTest123!', name: 'Audit Tester' })
  });
  const data = await resp.json();
  console.log(`  Status: ${resp.status}, Error: ${data.error || 'none'}`);
  console.log(`  Result: ${resp.status === 400 ? 'PASS' : 'FAIL'}`);
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

// Test 9: Forgot password
console.log("\nTEST 9: Forgot password for existing user");
try {
  const resp = await fetch('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'audit-test@example.com' })
  });
  const data = await resp.json();
  console.log(`  Status: ${resp.status}, Success: ${data.success}`);
  // Check token was created
  const [tokens] = await conn.execute('SELECT * FROM password_reset_tokens WHERE userId = (SELECT id FROM users WHERE email = ?)', ['audit-test@example.com']);
  console.log(`  Token created in DB: ${tokens.length > 0 ? 'PASS' : 'FAIL'}`);
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

// Test 10: Forgot password for non-existent email (should still return success for security)
console.log("\nTEST 10: Forgot password for non-existent email");
try {
  const resp = await fetch('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doesnotexist@example.com' })
  });
  const data = await resp.json();
  console.log(`  Status: ${resp.status}, Success: ${data.success}`);
  console.log(`  Result: ${data.success ? 'PASS - no email enumeration' : 'FAIL - leaks user existence'}`);
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

// Test 11: Login as client user
console.log("\nTEST 11: Login as client (non-admin) user");
try {
  const resp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'audit-test@example.com', password: 'AuditTest123!' })
  });
  const data = await resp.json();
  console.log(`  Status: ${resp.status}, Role: ${data.user?.role || 'N/A'}`);
  console.log(`  Result: ${data.user?.role === 'user' ? 'PASS' : 'FAIL'}`);
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

// Cleanup test user
await conn.execute('DELETE FROM password_reset_tokens WHERE userId = (SELECT id FROM users WHERE email = ?)', ['audit-test@example.com']);
await conn.execute('DELETE FROM user_sessions WHERE userId = (SELECT id FROM users WHERE email = ?)', ['audit-test@example.com']);
await conn.execute('DELETE FROM users WHERE email = ?', ['audit-test@example.com']);
console.log("\nCleanup: test user deleted");

await conn.end();
console.log("\n=== AUTH TESTS COMPLETE ===");
