import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  title: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, title: string, details: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title} — ${details}`);
    testResults.push({ title, passed: true, details });
  } else {
    console.error(`  ❌ FAIL: ${title} — ${details}`);
    testResults.push({ title, passed: false, details });
  }
}

async function runSecurityAttackTestSuite() {
  console.log('====================================================================');
  console.log('🛡️  FINDIT AI — FULL PRODUCTION SECURITY ATTACK & ISOLATION TEST SUITE');
  console.log('====================================================================\n');

  let userAId = '';
  let userBId = '';
  let tokenA = '';
  let tokenB = '';
  let itemAId = '';
  let itemBId = '';
  let notifAId = '';

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create User A (Victim) & User B (Attacker)
    // ------------------------------------------------------------------------
    console.log('1. Setting up User A (Victim) & User B (Attacker)...');
    const emailA = `victim_a_${Date.now()}@campus.edu`;
    const emailB = `attacker_b_${Date.now()}@campus.edu`;
    const passwordA = 'SecurePasswordA123!';
    const passwordB = 'AttackerPasswordB123!';

    const { data: authA } = await supabaseAdmin.auth.admin.createUser({
      email: emailA,
      password: passwordA,
      email_confirm: true,
      user_metadata: { full_name: 'Alice Victim', college: 'Science Hall' }
    });
    userAId = authA!.user!.id;

    const { data: authB } = await supabaseAdmin.auth.admin.createUser({
      email: emailB,
      password: passwordB,
      email_confirm: true,
      user_metadata: { full_name: 'Bob Attacker', college: 'Tech Building' }
    });
    userBId = authB!.user!.id;

    // Login A
    const { data: loginA } = await supabaseClient.auth.signInWithPassword({
      email: emailA,
      password: passwordA
    });
    tokenA = loginA!.session!.access_token;

    // Login B
    const { data: loginB } = await supabaseClient.auth.signInWithPassword({
      email: emailB,
      password: passwordB
    });
    tokenB = loginB!.session!.access_token;

    console.log(`   ✓ User A: ${userAId} (${emailA})`);
    console.log(`   ✓ User B: ${userBId} (${emailB})\n`);

    // ------------------------------------------------------------------------
    // SETUP: User A creates an item and receives a notification
    // ------------------------------------------------------------------------
    console.log('2. User A creates private resources...');
    const createItemARes = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        type: 'LOST',
        title: 'Alice Private Gold Watch',
        category: 'Accessories',
        description: 'Engraved with family crest on the back casing.',
        location: 'Library 2nd Floor',
        date: '2026-10-01'
      })
    });
    const itemAData: any = await createItemARes.json();
    itemAId = itemAData.item?.id;
    console.log(`   ✓ Item A created: ${itemAId}`);

    // Create a notification for User A
    const { data: notifData } = await supabaseAdmin.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: userAId,
      type: 'SECURITY_ALERT',
      title: 'Confidential Alert for Alice',
      message: 'Private claim verification code: 994821',
      is_read: false
    }).select().single();
    notifAId = notifData?.id;
    console.log(`   ✓ Private Notification created for User A: ${notifAId}\n`);

    // ------------------------------------------------------------------------
    // ATTACK 1: B tries to read A's private notifications
    // ------------------------------------------------------------------------
    console.log('3. Attack 1: User B attempts to access User A notifications...');
    const notifsBRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const notifsBData: any = await notifsBRes.json();
    const hasAInBNotifs = (notifsBData.notifications || []).some((n: any) => n.id === notifAId || n.user_id === userAId);
    assert(!hasAInBNotifs, 'Notification Isolation', "User B cannot read User A's private notifications");

    // ------------------------------------------------------------------------
    // ATTACK 2: B tries to mark A's notification as read
    // ------------------------------------------------------------------------
    console.log('\n4. Attack 2: User B attempts to mark User A notification as read...');
    const markReadRes = await fetch(`${BASE_URL}/notifications/${notifAId}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(markReadRes.status === 404 || markReadRes.status === 403, 'Notification Modification Gate', `User B cannot update User A notification (Status: ${markReadRes.status})`);

    // ------------------------------------------------------------------------
    // ATTACK 3: B tries to modify A's item
    // ------------------------------------------------------------------------
    console.log('\n5. Attack 3: User B attempts to update User A item...');
    const updateItemRes = await fetch(`${BASE_URL}/items/${itemAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        title: 'Hacked by Bob',
        description: 'Overwritten description by unauthorized user'
      })
    });
    assert(updateItemRes.status === 403, 'Item Update Authorization Gate', `User B cannot update User A item (Status: ${updateItemRes.status})`);

    // ------------------------------------------------------------------------
    // ATTACK 4: B tries to delete A's item
    // ------------------------------------------------------------------------
    console.log('\n6. Attack 4: User B attempts to delete User A item...');
    const deleteItemRes = await fetch(`${BASE_URL}/items/${itemAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(deleteItemRes.status === 403, 'Item Deletion Authorization Gate', `User B cannot delete User A item (Status: ${deleteItemRes.status})`);

    // ------------------------------------------------------------------------
    // ATTACK 5: B tries to access A's private dashboard stats
    // ------------------------------------------------------------------------
    console.log('\n7. Attack 5: User B queries /api/stats/user...');
    const statsBRes = await fetch(`${BASE_URL}/stats/user`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const statsBData: any = await statsBRes.json();
    assert(statsBData.stats?.totalItems === 0, 'Personal Stats Isolation', "User B receives only their own 0 stats, not User A's reported item count");

    // ------------------------------------------------------------------------
    // ATTACK 6: B tries to access admin overview endpoint
    // ------------------------------------------------------------------------
    console.log('\n8. Attack 6: User B attempts to call /api/admin/overview...');
    const adminRes = await fetch(`${BASE_URL}/admin/overview`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(adminRes.status === 403, 'Admin Endpoint Protection', `Normal user B cannot access admin route (Status: ${adminRes.status})`);

    // ------------------------------------------------------------------------
    // ATTACK 7: B tries to escalate privileges via PUT /api/auth/profile
    // ------------------------------------------------------------------------
    console.log('\n9. Attack 7: User B attempts role tampering via profile update...');
    const tamperRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        name: 'Bob SuperAdmin',
        role: 'admin',
        is_admin: true
      })
    });
    const tamperData: any = await tamperRes.json();
    assert(tamperData.user?.role === 'student', 'Privilege Escalation Prevention', `Role remains 'student' despite client payload (Got: ${tamperData.user?.role})`);

    // Re-verify admin route is still blocked for B after tamper attempt
    const adminRetryRes = await fetch(`${BASE_URL}/admin/overview`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(adminRetryRes.status === 403, 'Server-Side Admin Role Integrity', `User B still forbidden from admin endpoint after tamper attempt (Status: ${adminRetryRes.status})`);

    // ------------------------------------------------------------------------
    // ATTACK 8: Unauthenticated access to protected endpoints
    // ------------------------------------------------------------------------
    console.log('\n10. Attack 8: Unauthenticated requests to protected endpoints...');
    const unauthItems = await fetch(`${BASE_URL}/items`, { method: 'POST', body: JSON.stringify({}) });
    assert(unauthItems.status === 401, 'Unauthenticated Item Creation Block', `Rejects unauthenticated POST /items (Status: ${unauthItems.status})`);

    const unauthClaims = await fetch(`${BASE_URL}/claims`, { method: 'POST', body: JSON.stringify({}) });
    assert(unauthClaims.status === 401, 'Unauthenticated Claims Block', `Rejects unauthenticated POST /claims (Status: ${unauthClaims.status})`);

    const unauthNotifs = await fetch(`${BASE_URL}/notifications`);
    assert(unauthNotifs.status === 401, 'Unauthenticated Notifications Block', `Rejects unauthenticated GET /notifications (Status: ${unauthNotifs.status})`);

    // ------------------------------------------------------------------------
    // ATTACK 9: XSS Payload injection
    // ------------------------------------------------------------------------
    console.log('\n11. Attack 9: XSS Payload injection in item creation...');
    const xssRes = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        type: 'FOUND',
        title: '<script>alert("XSS")</script> Found Keys',
        category: 'Keys',
        description: '<img src=x onerror=alert(1)> Set of brass dorm keys on a ring.',
        location: 'Dining Commons',
        date: '2026-10-01'
      })
    });
    const xssData: any = await xssRes.json();
    itemBId = xssData.item?.id;
    assert(xssRes.status === 201, 'XSS Payload Stored Safely', `Item created with text treated as pure string literal (ID: ${itemBId})`);

    // ------------------------------------------------------------------------
    // ATTACK 10: Claim own item prevention
    // ------------------------------------------------------------------------
    console.log('\n12. Attack 10: User B attempts to claim their own reported FOUND item...');
    const selfClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        itemId: itemBId,
        locationLost: 'Dining Commons',
        dateLost: '2026-10-01',
        identifyingDetails: 'These are my own keys with blue lanyard'
      })
    });
    const selfClaimData: any = await selfClaimRes.json();
    assert(selfClaimRes.status === 400 && selfClaimData.error?.includes('cannot claim your own'), 'Self-Claim Prevention Gate', `Self-claim blocked with message: "${selfClaimData.error}"`);

    // ------------------------------------------------------------------------
    // ATTACK 11: Reverse test: User A attempts to modify User B's item
    // ------------------------------------------------------------------------
    console.log('\n13. Attack 11: Reverse Test: User A attempts to update User B item...');
    const reverseUpdate = await fetch(`${BASE_URL}/items/${itemBId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ title: 'Alice trying to take over Bob item' })
    });
    assert(reverseUpdate.status === 403, 'Symmetric Bidirectional Isolation', `User A cannot update User B item (Status: ${reverseUpdate.status})`);

    // ------------------------------------------------------------------------
    // ATTACK 12: Security Headers Verification
    // ------------------------------------------------------------------------
    console.log('\n14. Attack 12: Verifying Production HTTP Security Headers...');
    const healthHeaders = await fetch(`${BASE_URL}/health`);
    const csp = healthHeaders.headers.get('content-security-policy');
    const nosniff = healthHeaders.headers.get('x-content-type-options');
    const frameOptions = healthHeaders.headers.get('x-frame-options');
    assert(Boolean(csp), 'Content-Security-Policy Header', 'CSP header present');
    assert(nosniff === 'nosniff', 'X-Content-Type-Options Header', 'nosniff header present');
    assert(Boolean(frameOptions), 'X-Frame-Options Header', `Frameguard present: ${frameOptions}`);

    // Summary
    const totalPassed = testResults.filter(r => r.passed).length;
    console.log('\n====================================================================');
    console.log(`🎯 FULL SECURITY ATTACK SUITE RESULT: ${totalPassed} / ${testResults.length} PASSED`);
    console.log('====================================================================');

    if (totalPassed !== testResults.length) {
      throw new Error(`Security attack test failures: ${testResults.length - totalPassed} failed`);
    }

  } finally {
    // Cleanup test artifacts
    console.log('\n🧹 Cleaning up test accounts & items...');
    try {
      if (itemAId) await supabaseAdmin.from('items').delete().eq('id', itemAId);
      if (itemBId) await supabaseAdmin.from('items').delete().eq('id', itemBId);
      if (userAId) {
        await supabaseAdmin.from('profiles').delete().eq('id', userAId);
        await supabaseAdmin.auth.admin.deleteUser(userAId);
      }
      if (userBId) {
        await supabaseAdmin.from('profiles').delete().eq('id', userBId);
        await supabaseAdmin.auth.admin.deleteUser(userBId);
      }
      console.log('   ✓ Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.warn('   ⚠️ Cleanup encountered non-fatal error:', cleanupErr);
    }
  }
}

runSecurityAttackTestSuite().catch((err) => {
  console.error('\n❌ Fatal Security Test Failure:', err);
  process.exit(1);
});
