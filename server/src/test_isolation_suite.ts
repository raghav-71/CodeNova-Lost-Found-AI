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

async function runTwoUserIsolationTestSuite() {
  console.log('====================================================================');
  console.log('🧪 FINDIT AI — PHASE 1: COMPREHENSIVE TWO-USER ISOLATION TEST SUITE');
  console.log('====================================================================\n');

  try {
    // ------------------------------------------------------------------------
    // STEP 1: Health check
    // ------------------------------------------------------------------------
    console.log('Step 1: Checking Server Health & Auth Subsystem...');
    const healthRes: any = await fetch(`${BASE_URL}/health`).then(r => r.json());
    console.log('   ✓ Server online:', healthRes.product, '| Auth:', healthRes.authSystem);

    // ------------------------------------------------------------------------
    // STEP 2: Register Real Supabase User A (Maya Lin)
    // ------------------------------------------------------------------------
    console.log('\nStep 2: Registering Real Supabase User A (Maya Lin)...');
    const emailA = `maya_${Date.now()}@campus.edu`;
    const passwordA = 'SecureCampus2026!';
    
    // Create via Supabase Auth Admin
    const { data: authDataA, error: authErrA } = await supabaseAdmin.auth.admin.createUser({
      email: emailA,
      password: passwordA,
      email_confirm: true,
      user_metadata: {
        full_name: 'Maya Lin',
        college: 'Design & Architecture Pavilion',
        campus: 'South Campus',
        phone: '+1 (555) 111-2222'
      }
    });

    if (authErrA || !authDataA.user) {
      throw new Error(`Failed to create Supabase User A: ${authErrA?.message}`);
    }
    const userAId = authDataA.user.id;
    console.log('   ✓ Supabase User A created with authoritative auth.users.id:', userAId);

    // Sign in to get access token for User A
    const { data: signInA, error: signInErrA } = await supabaseClient.auth.signInWithPassword({
      email: emailA,
      password: passwordA
    });
    if (signInErrA || !signInA.session) {
      throw new Error(`Failed to sign in User A: ${signInErrA?.message}`);
    }
    const tokenA = signInA.session.access_token;
    console.log('   ✓ User A authenticated with Supabase session token');

    // ------------------------------------------------------------------------
    // STEP 3: Verify User A Profile (/api/auth/me)
    // ------------------------------------------------------------------------
    console.log('\nStep 3: Verifying User A Profile Isolation (/api/auth/me)...');
    const profileResA: any = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    }).then(r => r.json());
    if (profileResA.user?.id !== userAId || profileResA.user?.name !== 'Maya Lin') {
      throw new Error(`User A profile mismatch! Got: ${JSON.stringify(profileResA)}`);
    }
    console.log('   ✓ User A profile verified:', profileResA.user.name, 'ID:', profileResA.user.id);

    // ------------------------------------------------------------------------
    // STEP 4: User A creates a LOST report and a FOUND report
    // ------------------------------------------------------------------------
    console.log('\nStep 4: User A creates LOST report and FOUND report...');
    const lostResA: any = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        type: 'LOST',
        title: 'Matte Black Apple MacBook Pro 14 (M3 Pro)',
        category: 'Electronics',
        description: 'Space black MacBook with a Figma design sticker on the top cover.',
        location: 'Main University Library',
        building_zone: '3rd Floor Study Pods',
        date: '2026-09-20',
        characteristics: 'Figma sticker on top cover'
      })
    }).then(r => r.json());
    const lostItemAId = lostResA.item?.id;
    console.log('   ✓ User A reported LOST item:', lostResA.item?.title, 'ID:', lostItemAId);

    const foundResA: any = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        type: 'FOUND',
        title: 'Sony WH-1000XM5 Wireless Headphones (Silver)',
        category: 'Electronics',
        description: 'Found in gray protective carrying case on study table.',
        location: 'Main University Library',
        building_zone: '2nd Floor Reading Room',
        date: '2026-09-20',
        characteristics: 'Silver headphones in gray case'
      })
    }).then(r => r.json());
    const foundItemAId = foundResA.item?.id;
    console.log('   ✓ User A reported FOUND item:', foundResA.item?.title, 'ID:', foundItemAId);

    // Verify User A personal stats
    const statsA: any = await fetch(`${BASE_URL}/stats/user`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    }).then(r => r.json());
    console.log('   ✓ User A personal stats:', {
      itemsLost: statsA.stats.itemsLost,
      itemsFound: statsA.stats.itemsFound,
      totalItems: statsA.stats.totalItems
    });

    if (statsA.stats.itemsLost !== 1 || statsA.stats.itemsFound !== 1) {
      throw new Error(`User A stats incorrect! Expected 1 lost and 1 found, got: ${JSON.stringify(statsA.stats)}`);
    }

    // ------------------------------------------------------------------------
    // STEP 5: Register Brand-New Real Supabase User B (Kiran Patel)
    // ------------------------------------------------------------------------
    console.log('\nStep 5: Registering Fresh Real Supabase User B (Kiran Patel)...');
    const emailB = `kiran_${Date.now()}@campus.edu`;
    const passwordB = 'SecureCampus2026!';
    
    const { data: authDataB, error: authErrB } = await supabaseAdmin.auth.admin.createUser({
      email: emailB,
      password: passwordB,
      email_confirm: true,
      user_metadata: {
        full_name: 'Kiran Patel',
        college: 'Computer Science Department',
        campus: 'North Campus',
        phone: '+1 (555) 333-4444'
      }
    });

    if (authErrB || !authDataB.user) {
      throw new Error(`Failed to create Supabase User B: ${authErrB?.message}`);
    }
    const userBId = authDataB.user.id;
    console.log('   ✓ Supabase User B created with authoritative auth.users.id:', userBId);

    const { data: signInB, error: signInErrB } = await supabaseClient.auth.signInWithPassword({
      email: emailB,
      password: passwordB
    });
    if (signInErrB || !signInB.session) {
      throw new Error(`Failed to sign in User B: ${signInErrB?.message}`);
    }
    const tokenB = signInB.session.access_token;
    console.log('   ✓ User B authenticated with Supabase session token');

    // ------------------------------------------------------------------------
    // STEP 6: CRITICAL REQUIREMENT — Fresh Account Dashboard Isolation for User B
    // ------------------------------------------------------------------------
    console.log('\nStep 6: Verifying User B Fresh Account Starts at 0 (No User A Data Leak)...');
    const statsB: any = await fetch(`${BASE_URL}/stats/user`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    }).then(r => r.json());
    console.log('   ✓ User B personal dashboard stats:', statsB.stats);

    if (
      statsB.stats.itemsLost !== 0 ||
      statsB.stats.itemsFound !== 0 ||
      statsB.stats.totalItems !== 0 ||
      statsB.stats.activeClaims !== 0 ||
      statsB.stats.potentialMatches !== 0 ||
      statsB.stats.unreadNotifications !== 0
    ) {
      throw new Error(`Fresh account isolation failed! User B personal stats are not 0: ${JSON.stringify(statsB.stats)}`);
    }

    // Verify User B "My Items" list is empty
    const myItemsB: any = await fetch(`${BASE_URL}/items?userId=${userBId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    }).then(r => r.json());
    if (myItemsB.items.length !== 0) {
      throw new Error(`User B sees items in "My Items" list! Count: ${myItemsB.items.length}`);
    }
    console.log('   ✓ PASSED: User B "My Items" is completely clean and empty (0 items).');

    // Verify User B notifications are empty
    const notifsB: any = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    }).then(r => r.json());
    if (notifsB.notifications.length !== 0) {
      throw new Error(`User B sees notifications belonging to someone else! Count: ${notifsB.notifications.length}`);
    }
    console.log('   ✓ PASSED: User B notifications are completely clean (0 notifications).');

    // ------------------------------------------------------------------------
    // STEP 7: Public Directory vs IDOR Security Tests
    // ------------------------------------------------------------------------
    console.log('\nStep 7: Testing Public Directory Access & IDOR Prevention...');
    
    // User B CAN discover public items in campus directory
    const publicItems: any = await fetch(`${BASE_URL}/items`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    }).then(r => r.json());
    const foundInDirectory = publicItems.items.find((i: any) => i.id === foundItemAId);
    if (!foundInDirectory) {
      throw new Error('Public item not discoverable in directory!');
    }
    console.log('   ✓ Public listing discoverable in catalog for campus matching:', foundInDirectory.title);

    // User B CANNOT edit User A's item (IDOR Attack blocked)
    console.log('   🛡️ Testing IDOR Attack: User B attempts to edit User A item (Must return 403)...');
    const idorEditRes = await fetch(`${BASE_URL}/items/${lostItemAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ title: 'Hacked MacBook' })
    });
    if (idorEditRes.status === 403) {
      console.log('   ✓ PASSED: IDOR item update blocked with 403 Forbidden');
    } else {
      throw new Error(`IDOR update check failed! Status: ${idorEditRes.status}`);
    }

    // User B CANNOT delete User A's item (IDOR Attack blocked)
    console.log('   🛡️ Testing IDOR Attack: User B attempts to delete User A item (Must return 403)...');
    const idorDeleteRes = await fetch(`${BASE_URL}/items/${lostItemAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (idorDeleteRes.status === 403) {
      console.log('   ✓ PASSED: IDOR item delete blocked with 403 Forbidden');
    } else {
      throw new Error(`IDOR delete check failed! Status: ${idorDeleteRes.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 8: Business Rule — Self-Claim Blocked
    // ------------------------------------------------------------------------
    console.log('\nStep 8: Testing Self-Claim Prevention (Exact error text check)...');
    const selfClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        itemId: foundItemAId,
        locationLost: 'Main Library',
        dateLost: '2026-09-20',
        identifyingDetails: 'Trying to claim my own found item',
        contactShareConsent: true
      })
    });
    const selfClaimJson: any = await selfClaimRes.json();
    const isSelfClaimBlocked = selfClaimRes.status === 400 && (
      selfClaimJson.error === 'You cannot claim an item you reported as found.' ||
      selfClaimJson.error === 'You cannot claim your own reported item.'
    );
    if (isSelfClaimBlocked) {
      console.log('   ✓ PASSED: Self-claim blocked with error:', selfClaimJson.error);
    } else {
      throw new Error(`Self-claim check failed! Status: ${selfClaimRes.status}, Body: ${JSON.stringify(selfClaimJson)}`);
    }

    // ------------------------------------------------------------------------
    // STEP 9: Cross-User Claim Submission (User B claims User A Found Item)
    // ------------------------------------------------------------------------
    console.log('\nStep 9: User B submits ownership claim on User A Found Headphones...');
    const claimResB: any = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        itemId: foundItemAId,
        locationLost: 'Main Library 2nd floor reading desk',
        dateLost: '2026-09-20',
        identifyingDetails: 'Silver Sony XM5 headphones with small scratch on left ear cup hinge and custom carrying case.',
        proofNotes: 'I have the original Sony companion app device registration on my phone.',
        contactShareConsent: true
      })
    }).then(r => r.json());
    console.log('   ✓ Claim submitted by User B:', claimResB.claimId);
    const claimId = claimResB.claimId;

    // Verify User B sees it in "My Claims"
    const myClaimsB: any = await fetch(`${BASE_URL}/claims/my-claims`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    }).then(r => r.json());
    if (myClaimsB.claims.length !== 1 || myClaimsB.claims[0].id !== claimId) {
      throw new Error('User B my-claims list did not return the submitted claim!');
    }
    console.log('   ✓ User B "My Claims" contains submitted claim:', myClaimsB.claims[0].item_title);

    // Verify User A receives claim notification & sees it in "Received Claims"
    console.log('\nStep 10: User A receives notification & reviews received claim...');
    const notifsA: any = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    }).then(r => r.json());
    const claimNotif = notifsA.notifications.find((n: any) => n.type === 'CLAIM_RECEIVED');
    if (!claimNotif) {
      throw new Error('User A did not receive CLAIM_RECEIVED notification!');
    }
    console.log('   ✓ User A received claim alert:', claimNotif.title, '-', claimNotif.message);

    const receivedClaimsA: any = await fetch(`${BASE_URL}/claims/received`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    }).then(r => r.json());
    const receivedClaim = receivedClaimsA.claims.find((c: any) => c.id === claimId);
    if (!receivedClaim || receivedClaim.claimant_name !== 'Kiran Patel') {
      throw new Error('Received claim not found in User A received list!');
    }
    console.log('   ✓ User A received claim verified from claimant:', receivedClaim.claimant_name);

    // ------------------------------------------------------------------------
    // STEP 11: IDOR Claim Management Check (User B cannot approve own claim)
    // ------------------------------------------------------------------------
    console.log('\nStep 11: Testing IDOR Claim Status Update (User B cannot approve claim)...');
    const idorApproveRes = await fetch(`${BASE_URL}/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    if (idorApproveRes.status === 403) {
      console.log('   ✓ PASSED: Unauthorized claim approval blocked with 403 Forbidden');
    } else {
      throw new Error(`IDOR claim approval check failed! Status: ${idorApproveRes.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 12: User A Approves User B Claim & Resolves Item
    // ------------------------------------------------------------------------
    console.log('\nStep 12: User A approves User B claim & User B confirms receipt...');
    const approveRes: any = await fetch(`${BASE_URL}/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        status: 'APPROVED',
        resolutionNotes: 'Verified scratch and companion app serial number.'
      })
    }).then(r => r.json());
    console.log('   ✓ Claim approved:', approveRes.message, 'Status:', approveRes.status);

    // Claimant confirms receipt ("I Received My Item")
    const resolveRes: any = await fetch(`${BASE_URL}/claims/${claimId}/resolve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenB}`
      }
    }).then(r => r.json());
    console.log('   ✓ Claimant confirmed receipt:', resolveRes.message, 'Status:', resolveRes.status);

    // Verify item is now RESOLVED
    const resolvedItem: any = await fetch(`${BASE_URL}/items/${foundItemAId}`).then(r => r.json());
    if (resolvedItem.item?.status !== 'RESOLVED') {
      throw new Error(`Item status is not RESOLVED! Got: ${resolvedItem.item?.status}`);
    }
    console.log('   ✓ PASSED: Item status updated to RESOLVED');

    // ------------------------------------------------------------------------
    // STEP 13: Logout / Login Switching Hygiene Check
    // ------------------------------------------------------------------------
    console.log('\nStep 13: Verifying User Logout & Login Switching Hygiene...');
    // User A logs back in and checks their data
    const { data: reAuthA } = await supabaseClient.auth.signInWithPassword({
      email: emailA,
      password: passwordA
    });
    const reTokenA = reAuthA.session!.access_token;
    const finalStatsA: any = await fetch(`${BASE_URL}/stats/user`, {
      headers: { 'Authorization': `Bearer ${reTokenA}` }
    }).then(r => r.json());

    if (finalStatsA.stats.resolvedItems !== 1 || finalStatsA.stats.itemsLost !== 1) {
      throw new Error(`User A re-login state mismatch! Got: ${JSON.stringify(finalStatsA.stats)}`);
    }
    console.log('   ✓ User A re-logged in: personal data intact (1 Lost, 1 Found, 1 Resolved)');

    // User B logs back in and checks their data
    const { data: reAuthB } = await supabaseClient.auth.signInWithPassword({
      email: emailB,
      password: passwordB
    });
    const reTokenB = reAuthB.session!.access_token;
    const finalStatsB: any = await fetch(`${BASE_URL}/stats/user`, {
      headers: { 'Authorization': `Bearer ${reTokenB}` }
    }).then(r => r.json());

    if (finalStatsB.stats.itemsLost !== 0 || finalStatsB.stats.itemsFound !== 0) {
      throw new Error(`User B re-login state contaminated! Got: ${JSON.stringify(finalStatsB.stats)}`);
    }
    console.log('   ✓ User B re-logged in: isolated state completely intact (0 Lost, 0 Found, 0 Contamination)');

    console.log('\n====================================================================');
    console.log('🎉 ALL TWO-USER ISOLATION, RLS, AUTH & IDOR TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================================\n');

  } catch (err) {
    console.error('\n❌ Isolation Test Suite Failed:', err);
    process.exit(1);
  }
}

runTwoUserIsolationTestSuite();
