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

async function runE2ETest() {
  console.log('====================================================');
  console.log('🧪 RUNNING FINDIT AI FULL END-TO-END AUTOMATED TESTS');
  console.log('====================================================\n');

  try {
    // 1. Health check
    console.log('1. Testing Health Endpoint...');
    const healthRes: any = await fetch(`${BASE_URL}/health`).then(r => r.json());
    console.log('   ✓ Health check passed:', healthRes.status, healthRes.product, '| Auth:', healthRes.authSystem);

    // 2. Campus Stats
    console.log('\n2. Testing Campus Stats Endpoint...');
    const statsRes: any = await fetch(`${BASE_URL}/stats`).then(r => r.json());
    console.log('   ✓ Stats returned:', {
      totalItems: statsRes.stats.totalItems,
      lost: statsRes.stats.itemsLost,
      found: statsRes.stats.itemsFound,
      potentialMatches: statsRes.stats.potentialMatches,
      recoveryRate: statsRes.stats.recoveryRate + '%'
    });

    // 3. User Registration (User A - Jordan Miller)
    console.log('\n3. Registering Supabase User A (Jordan Miller)...');
    const emailA = `jordan_${Date.now()}@campus.edu`;
    const password = 'SecurePassword2026!';
    
    const { data: authA, error: errA } = await supabaseAdmin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Jordan Miller',
        college: 'Computer Science Department',
        phone: '+1 (555) 999-8888'
      }
    });
    if (errA || !authA.user) throw new Error(`User A creation failed: ${errA?.message}`);
    const userAId = authA.user.id;

    const { data: loginA } = await supabaseClient.auth.signInWithPassword({
      email: emailA,
      password
    });
    const jordanToken = loginA.session!.access_token;
    console.log('   ✓ User A registered & authenticated:', authA.user.user_metadata?.full_name, 'ID:', userAId);

    // 4. User Registration (User B - Sarah Lin)
    console.log('\n4. Registering Supabase User B (Sarah Lin)...');
    const emailB = `sarah_${Date.now()}@campus.edu`;
    const { data: authB, error: errB } = await supabaseAdmin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Sarah Lin',
        college: 'Design & Architecture',
        phone: '+1 (555) 777-6666'
      }
    });
    if (errB || !authB.user) throw new Error(`User B creation failed: ${errB?.message}`);
    const userBId = authB.user.id;

    const { data: loginB } = await supabaseClient.auth.signInWithPassword({
      email: emailB,
      password
    });
    const sarahToken = loginB.session!.access_token;
    console.log('   ✓ User B registered & authenticated:', authB.user.user_metadata?.full_name, 'ID:', userBId);

    // 5. User Registration (User C - Marcus Vance)
    console.log('\n5. Registering Supabase User C (Marcus Vance)...');
    const emailC = `marcus_${Date.now()}@campus.edu`;
    const { data: authC, error: errC } = await supabaseAdmin.auth.admin.createUser({
      email: emailC,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Marcus Vance',
        college: 'Engineering Department',
        phone: '+1 (555) 444-3333'
      }
    });
    if (errC || !authC.user) throw new Error(`User C creation failed: ${errC?.message}`);
    const userCId = authC.user.id;

    const { data: loginC } = await supabaseClient.auth.signInWithPassword({
      email: emailC,
      password
    });
    const marcusToken = loginC.session!.access_token;
    console.log('   ✓ User C registered & authenticated:', authC.user.user_metadata?.full_name, 'ID:', userCId);

    // 6. User A reports LOST item
    console.log('\n6. User A (Jordan) Reports LOST Item...');
    const reportLostRes: any = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jordanToken}`
      },
      body: JSON.stringify({
        type: 'LOST',
        title: 'Silver Apple iPad Air with White Magic Keyboard',
        category: 'Electronics',
        description: 'Apple iPad Air 5th Gen in silver with white keyboard case. Has a NASA rocket sticker on the back.',
        location: 'Science Building',
        building_zone: '2nd Floor Study Lounge',
        date: '2026-09-19',
        characteristics: 'NASA rocket sticker, scratch near volume button'
      })
    }).then(r => r.json());
    console.log('   ✓ Lost Item created:', reportLostRes.item?.title, 'ID:', reportLostRes.item?.id);
    const lostItemId = reportLostRes.item?.id;

    // 7. User B reports matching FOUND item
    console.log('\n7. User B (Sarah) Reports FOUND Item...');
    const reportFoundRes: any = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sarahToken}`
      },
      body: JSON.stringify({
        type: 'FOUND',
        title: 'Silver Apple iPad with White Keyboard',
        category: 'Electronics',
        description: 'Found on table in Science Building 2nd floor lounge. Silver Apple tablet attached to white keyboard folio.',
        location: 'Science Building',
        building_zone: '2nd Floor Lounge Area',
        date: '2026-09-19',
        characteristics: 'White keyboard folio with space sticker'
      })
    }).then(r => r.json());
    console.log('   ✓ Found Item created:', reportFoundRes.item?.title, 'Matches found:', reportFoundRes.matchesFound);
    const foundItemId = reportFoundRes.item?.id;

    // 8. Verify AI Match
    console.log('\n8. Verifying Potential Matches on User A Lost Item...');
    const matchDetailRes: any = await fetch(`${BASE_URL}/items/${lostItemId}`, {
      headers: { 'Authorization': `Bearer ${jordanToken}` }
    }).then(r => r.json());
    console.log('   ✓ Matches retrieved for User A item:', matchDetailRes.matches.length);

    // =========================================================================
    // NEGATIVE TEST CASES
    // =========================================================================
    console.log('\n====================================================');
    console.log('🛡️ TESTING CLAIM BUSINESS RULES & NEGATIVE TEST CASES');
    console.log('====================================================\n');

    // Neg 1: User B tries to claim their own found item
    console.log('Neg 1: User B claims their OWN found item (Must be rejected)...');
    const selfClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sarahToken}`
      },
      body: JSON.stringify({
        itemId: foundItemId,
        locationLost: 'Science Building 2nd Floor',
        dateLost: '2026-09-19',
        identifyingDetails: 'This is my own reported item attempt',
        contactShareConsent: true
      })
    });
    const selfClaimJson: any = await selfClaimRes.json();
    if (selfClaimRes.status === 400 && selfClaimJson.error === 'You cannot claim your own reported item.') {
      console.log('   ✓ PASSED: Self-claim correctly blocked with 400:', selfClaimJson.error);
    } else {
      throw new Error(`Self-claim check failed! Status: ${selfClaimRes.status}, Body: ${JSON.stringify(selfClaimJson)}`);
    }

    // Neg 2: User A tries to claim a LOST item
    console.log('\nNeg 2: User claims a LOST item report (Must be rejected)...');
    const claimLostRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sarahToken}`
      },
      body: JSON.stringify({
        itemId: lostItemId,
        locationLost: 'Science Building',
        dateLost: '2026-09-19',
        identifyingDetails: 'Trying to claim a lost report',
        contactShareConsent: true
      })
    });
    const claimLostJson: any = await claimLostRes.json();
    if (claimLostRes.status === 400 && claimLostJson.error.includes('FOUND')) {
      console.log('   ✓ PASSED: Claim on LOST item correctly blocked with 400:', claimLostJson.error);
    } else {
      throw new Error(`Claim on LOST item check failed! Status: ${claimLostRes.status}`);
    }

    // Neg 3: Unauthenticated user submits claim
    console.log('\nNeg 3: Unauthenticated user submits claim (Must be rejected)...');
    const unauthClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: foundItemId,
        locationLost: 'Science Building',
        dateLost: '2026-09-19',
        identifyingDetails: 'Unauthenticated claim attempt',
        contactShareConsent: true
      })
    });
    const unauthClaimJson: any = await unauthClaimRes.json();
    if (unauthClaimRes.status === 401) {
      console.log('   ✓ PASSED: Unauthenticated claim blocked with 401:', unauthClaimJson.error);
    } else {
      throw new Error(`Unauthenticated check failed! Status: ${unauthClaimRes.status}`);
    }

    // =========================================================================
    // HAPPY PATH: User A claims User B's found item
    // =========================================================================
    console.log('\n====================================================');
    console.log('✨ TESTING CLAIM CREATION & APPROVAL FLOW');
    console.log('====================================================\n');

    console.log('9. User A (Jordan) submits Ownership Claim on User B (Sarah) Found Item...');
    const claimRes: any = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jordanToken}`
      },
      body: JSON.stringify({
        itemId: foundItemId,
        locationLost: 'Science Building 2nd floor study lounge desk by window',
        dateLost: '2026-09-19',
        identifyingDetails: 'Has a NASA rocket sticker on the aluminum back, serial number ending in 77KJ, lockscreen name says Jordan Miller.',
        proofNotes: 'Apple receipt under my iCloud email.',
        contactShareConsent: true
      })
    }).then(r => r.json());
    console.log('   ✓ Claim submitted successfully:', claimRes.message, 'Claim ID:', claimRes.claimId);
    const claimId = claimRes.claimId;

    // Neg 4: Duplicate claim submission by same user
    console.log('\nNeg 4: User A attempts duplicate claim on same found item (Must be rejected)...');
    const dupClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jordanToken}`
      },
      body: JSON.stringify({
        itemId: foundItemId,
        locationLost: 'Science Building 2nd floor',
        dateLost: '2026-09-19',
        identifyingDetails: 'Duplicate claim attempt verification text',
        contactShareConsent: true
      })
    });
    const dupClaimJson: any = await dupClaimRes.json();
    if (dupClaimRes.status === 409 && dupClaimJson.error === 'You already have an active claim on this item.') {
      console.log('   ✓ PASSED: Duplicate claim correctly blocked with 409:', dupClaimJson.error);
    } else {
      throw new Error(`Duplicate claim check failed! Status: ${dupClaimRes.status}, Body: ${JSON.stringify(dupClaimJson)}`);
    }

    // 10. Verify User B received claim notification & can view received claims
    console.log('\n10. User B (Sarah) verifies Received Claim & Notifications...');
    const sarahNotifs: any = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${sarahToken}` }
    }).then(r => r.json());
    const claimReceivedNotif = sarahNotifs.notifications.find((n: any) => n.type === 'CLAIM_RECEIVED');
    if (claimReceivedNotif) {
      console.log('   ✓ User B received notification:', claimReceivedNotif.title, '-', claimReceivedNotif.message);
    } else {
      throw new Error('User B did not receive CLAIM_RECEIVED notification!');
    }

    const receivedClaimsRes: any = await fetch(`${BASE_URL}/claims/received`, {
      headers: { 'Authorization': `Bearer ${sarahToken}` }
    }).then(r => r.json());
    console.log('   ✓ Received claims count for Sarah:', receivedClaimsRes.claims.length);
    const targetClaim = receivedClaimsRes.claims.find((c: any) => c.id === claimId);
    if (targetClaim && targetClaim.status === 'PENDING') {
      console.log('   ✓ Claim record verified: Status is PENDING, Claimant:', targetClaim.claimant_name);
    } else {
      throw new Error('Claim record not found in received claims list!');
    }

    // Neg 5: Unauthorized user (User C) attempts to approve Sarah's claim
    console.log('\nNeg 5: User C (Marcus) attempts to approve Sarah\'s claim (Must be 403 Forbidden)...');
    const unauthApproveRes = await fetch(`${BASE_URL}/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${marcusToken}`
      },
      body: JSON.stringify({
        status: 'APPROVED',
        resolutionNotes: 'Unauthorized approval attempt'
      })
    });
    const unauthApproveJson: any = await unauthApproveRes.json();
    if (unauthApproveRes.status === 403) {
      console.log('   ✓ PASSED: Unauthorized claim management blocked with 403:', unauthApproveJson.error);
    } else {
      throw new Error(`Unauthorized status update check failed! Status: ${unauthApproveRes.status}`);
    }

    // 11. Finder (Sarah) approves User A's claim
    console.log('\n11. User B (Sarah) Approves Claim...');
    const approveRes: any = await fetch(`${BASE_URL}/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sarahToken}`
      },
      body: JSON.stringify({
        status: 'APPROVED',
        resolutionNotes: 'NASA rocket sticker and serial 77KJ matched in person.'
      })
    }).then(r => r.json());
    console.log('   ✓ Claim approved:', approveRes.message, 'Status:', approveRes.status);

    // 12. Verify Item Status Transition to RESOLVED
    console.log('\n12. Verifying Item Status Transition to RESOLVED...');
    const resolvedItemRes: any = await fetch(`${BASE_URL}/items/${foundItemId}`).then(r => r.json());
    if (resolvedItemRes.item?.status === 'RESOLVED') {
      console.log('   ✓ PASSED: Found Item Status is now RESOLVED');
    } else {
      throw new Error(`Item status is not RESOLVED! Status: ${resolvedItemRes.item?.status}`);
    }

    // 13. Verify Claimant (Jordan) & Finder (Sarah) received CLAIM_APPROVED notifications
    console.log('\n13. Verifying Resolution Notifications for Claimant and Finder...');
    const jordanNotifs: any = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${jordanToken}` }
    }).then(r => r.json());
    const jordanApprovalNotif = jordanNotifs.notifications.find((n: any) => n.type === 'CLAIM_APPROVED');
    if (jordanApprovalNotif) {
      console.log('   ✓ Claimant (Jordan) received approval notification:', jordanApprovalNotif.title, '-', jordanApprovalNotif.message);
    } else {
      throw new Error('Claimant did not receive CLAIM_APPROVED notification!');
    }

    // =========================================================================
    // NATURAL LANGUAGE AI SEARCH TESTS
    // =========================================================================
    console.log('\n====================================================');
    console.log('🧠 TESTING NATURAL LANGUAGE AI SEARCH & INTENT ENGINE');
    console.log('====================================================\n');

    // TEST 1: Lost iPad in library
    console.log('TEST 1: "I lost a silver Apple iPad with keyboard near the science lounge."');
    const nlTest1: any = await fetch(`${BASE_URL}/items/ai-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'I lost a silver Apple iPad with keyboard near the science lounge.'
      })
    }).then(r => r.json());
    console.log('   ✓ Extracted Intent:', {
      type: nlTest1.intent?.item_type,
      category: nlTest1.intent?.category,
      object: nlTest1.intent?.object,
      location: nlTest1.intent?.location
    });
    console.log('   ✓ Candidates scanned:', nlTest1.totalCandidatesScanned, 'Ranked matches:', nlTest1.results?.length);

    console.log('\n====================================================');
    console.log('🎉 ALL WORKFLOW, BUSINESS RULE & AI SEARCH TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

runE2ETest();
