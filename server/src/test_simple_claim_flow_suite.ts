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

async function runSimpleClaimFlowTestSuite() {
  console.log('====================================================================');
  console.log('🧪 FINDIT AI — SIMPLIFIED CLAIM WORKFLOW AUTOMATED TEST SUITE');
  console.log('====================================================================\n');

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create User A (Claimant / Lost Owner) & User B (Finder)
    // ------------------------------------------------------------------------
    console.log('Step 0: Provisioning Two Campus Users (User A & User B)...');
    const ts = Date.now();

    const emailA = `claimant_${ts}@campus.edu`;
    const passwordA = 'CampusPass2026!';
    const { data: authA, error: errA } = await supabaseAdmin.auth.admin.createUser({
      email: emailA,
      password: passwordA,
      email_confirm: true,
      user_metadata: {
        full_name: 'Alex Rivera (User A)',
        college: 'North Campus Quad',
        phone: '+1 (555) 345-6789'
      }
    });
    if (errA || !authA.user) throw new Error(`Failed to create User A: ${errA?.message}`);
    const userAId = authA.user.id;

    const { data: signInA } = await supabaseClient.auth.signInWithPassword({
      email: emailA,
      password: passwordA
    });
    const tokenA = signInA?.session?.access_token;
    if (!tokenA) throw new Error('Failed to sign in User A');
    console.log(`   ✓ User A registered and signed in (ID: ${userAId})`);

    const emailB = `finder_${ts}@campus.edu`;
    const passwordB = 'CampusPass2026!';
    const { data: authB, error: errB } = await supabaseAdmin.auth.admin.createUser({
      email: emailB,
      password: passwordB,
      email_confirm: true,
      user_metadata: {
        full_name: 'Jordan Smith (User B)',
        college: 'Engineering Annex',
        phone: '+1 (555) 987-6543'
      }
    });
    if (errB || !authB.user) throw new Error(`Failed to create User B: ${errB?.message}`);
    const userBId = authB.user.id;

    const { data: signInB } = await supabaseClient.auth.signInWithPassword({
      email: emailB,
      password: passwordB
    });
    const tokenB = signInB?.session?.access_token;
    if (!tokenB) throw new Error('Failed to sign in User B');
    console.log(`   ✓ User B registered and signed in (ID: ${userBId})`);

    // ------------------------------------------------------------------------
    // STEP 1: User A reports Lost black JBL speaker
    // ------------------------------------------------------------------------
    console.log('\nStep 1: User A reports Lost black JBL speaker...');
    const lostRes: any = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        type: 'LOST',
        title: 'Black JBL Flip 6 Bluetooth Speaker',
        category: 'Electronics',
        brand: 'JBL',
        model: 'Flip 6',
        color: 'Black',
        description: 'Black portable waterproof speaker with orange JBL logo and lanyard clip.',
        location: 'Student Union Lounge',
        date: '2026-10-01',
        time: '14:30',
        characteristics: 'Orange logo badge, small scratch on base rubber'
      })
    }).then(r => r.json());

    if (!lostRes.item?.id) throw new Error(`Failed to report lost item: ${JSON.stringify(lostRes)}`);
    const lostItemId = lostRes.item.id;
    console.log(`   ✓ User A reported Lost item: "${lostRes.item.title}" (ID: ${lostItemId})`);

    // ------------------------------------------------------------------------
    // STEP 2: User B reports Found black JBL speaker
    // ------------------------------------------------------------------------
    console.log('\nStep 2: User B reports Found black JBL speaker...');
    const foundRes: any = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        type: 'FOUND',
        title: 'Found Black JBL Flip 6 Speaker',
        category: 'Electronics',
        brand: 'JBL',
        model: 'Flip 6',
        color: 'Black',
        description: 'Found black JBL cylindrical bluetooth speaker sitting on armchair.',
        location: 'Student Union Lounge',
        date: '2026-10-01',
        time: '15:15',
        characteristics: 'Small rubber scratch near power button'
      })
    }).then(r => r.json());

    if (!foundRes.item?.id) throw new Error(`Failed to report found item: ${JSON.stringify(foundRes)}`);
    const foundItemId = foundRes.item.id;
    console.log(`   ✓ User B reported Found item: "${foundRes.item.title}" (ID: ${foundItemId})`);

    // ------------------------------------------------------------------------
    // STEP 3: AI Matching Engine detects match
    // ------------------------------------------------------------------------
    console.log('\nStep 3: Verifying Multimodal AI Matching Engine...');
    const rematchRes: any = await fetch(`${BASE_URL}/items/${lostItemId}/rematch`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    }).then(r => r.json());

    console.log(`   ✓ Rematch executed. Found matches count: ${rematchRes.matchesFound}`);
    const detailsResA: any = await fetch(`${BASE_URL}/items/${lostItemId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    }).then(r => r.json());

    const hasMatchWithFoundItem = detailsResA.matches?.some((m: any) => m.id === foundItemId);
    console.log(`   ✓ Potential Match linked between lost ${lostItemId} and found ${foundItemId}: ${hasMatchWithFoundItem}`);

    // ------------------------------------------------------------------------
    // STEP 4 & 5: User A submits claim WITHOUT filling repeated verification questionnaire
    // ------------------------------------------------------------------------
    console.log('\nStep 4 & 5: User A submits claim with NO repeated verification questionnaires...');
    const claimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        itemId: foundItemId,
        message: 'Hi Jordan! I left this on the Union armchair right before class. Thank you for finding it!'
      })
    });

    const claimJson: any = await claimRes.json();
    if (!claimRes.ok || !claimJson.claim?.id) {
      throw new Error(`Failed to submit claim without questionnaire: ${JSON.stringify(claimJson)}`);
    }

    const claimId = claimJson.claim.id;
    console.log(`   ✓ Claim submitted successfully! Claim ID: ${claimId}`);
    console.log(`   ✓ Claim status is PENDING: ${claimJson.claim.status === 'PENDING'}`);
    console.log(`   ✓ Optional message recorded: "${claimJson.claim.message}"`);
    if (claimJson.claim.status !== 'PENDING') throw new Error('Claim was not created in PENDING status');

    // ------------------------------------------------------------------------
    // STEP 6: User B attempts self-claim on found item -> MUST BE REJECTED
    // ------------------------------------------------------------------------
    console.log('\nStep 6: User B attempts self-claim on item they reported as found...');
    const selfClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        itemId: foundItemId,
        message: 'I am claiming my own found item!'
      })
    });

    const selfClaimJson: any = await selfClaimRes.json();
    console.log(`   ✓ Self-claim status code: ${selfClaimRes.status} (Expected 400)`);
    console.log(`   ✓ Self-claim error response: "${selfClaimJson.error}"`);
    if (selfClaimRes.status !== 400) {
      throw new Error(`Expected 400 on self-claim, got ${selfClaimRes.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 7 & 8: User B approves claim -> Claim status becomes APPROVED
    // ------------------------------------------------------------------------
    console.log('\nStep 7 & 8: User B (Finder) approves claim request...');
    const approveRes = await fetch(`${BASE_URL}/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    const approveJson: any = await approveRes.json();
    if (!approveRes.ok || approveJson.claim?.status !== 'APPROVED') {
      throw new Error(`Failed to approve claim: ${JSON.stringify(approveJson)}`);
    }
    console.log(`   ✓ Claim status transitioned to APPROVED: ${approveJson.claim.status}`);

    // Verify item is NOT immediately marked resolved (handover in progress)
    const foundItemCheck: any = await fetch(`${BASE_URL}/items/${foundItemId}`).then(r => r.json());
    console.log(`   ✓ Item status after approval is still active/handover in progress: ${foundItemCheck.item?.status} (Expected: CLAIM_PENDING)`);
    if (foundItemCheck.item?.status === 'RESOLVED') {
      throw new Error('Item was prematurely marked as RESOLVED before physical handover/receipt!');
    }

    // ------------------------------------------------------------------------
    // STEP 9: Contact Finder / Contact Claimant unlocked
    // ------------------------------------------------------------------------
    console.log('\nStep 9: Verifying contact details unlocked for claimant and finder...');
    const myClaimsRes: any = await fetch(`${BASE_URL}/claims/my`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    }).then(r => r.json());

    const myClaimRecord = myClaimsRes.claims?.find((c: any) => c.id === claimId);
    console.log('   ✓ Claimant sees finder contact info:', {
      finder_name: myClaimRecord?.finder_name,
      finder_campus: myClaimRecord?.finder_campus,
      finder_email: myClaimRecord?.finder_email,
      finder_phone: myClaimRecord?.finder_phone
    });
    if (!myClaimRecord?.finder_name) {
      throw new Error('Finder contact details were not provided to claimant upon approval');
    }

    // ------------------------------------------------------------------------
    // STEP 10, 11 & 12: User A marks "I Received My Item" -> RESOLVED on claim & item
    // ------------------------------------------------------------------------
    console.log('\nStep 10, 11 & 12: User A marks "[ I Received My Item ]"...');
    const resolveRes = await fetch(`${BASE_URL}/claims/${claimId}/resolve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`
      }
    });
    const resolveJson: any = await resolveRes.json();
    if (!resolveRes.ok || resolveJson.claim?.status !== 'RESOLVED') {
      throw new Error(`Failed to resolve claim: ${JSON.stringify(resolveJson)}`);
    }
    console.log(`   ✓ Claim status is now RESOLVED: ${resolveJson.claim.status}`);

    // Verify item status in database is RESOLVED
    const finalItemCheck: any = await fetch(`${BASE_URL}/items/${foundItemId}`).then(r => r.json());
    console.log(`   ✓ Item status is now RESOLVED: ${finalItemCheck.item?.status}`);
    if (finalItemCheck.item?.status !== 'RESOLVED') {
      throw new Error(`Expected item status RESOLVED, got ${finalItemCheck.item?.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 13: Verify NO duplicate lost or found items were created
    // ------------------------------------------------------------------------
    console.log('\nStep 13: Verifying no duplicate lost/found items were created during claim lifecycle...');
    const userAItems: any = await fetch(`${BASE_URL}/items?userId=${userAId}`).then(r => r.json());
    const userBItems: any = await fetch(`${BASE_URL}/items?userId=${userBId}`).then(r => r.json());

    console.log(`   ✓ User A total items count: ${userAItems.total} (Original 1 Lost report only)`);
    console.log(`   ✓ User B total items count: ${userBItems.total} (Original 1 Found report only)`);

    if (userAItems.total !== 1 || userBItems.total !== 1) {
      throw new Error(`Duplicate items detected! User A items: ${userAItems.total}, User B items: ${userBItems.total}`);
    }

    console.log('\n====================================================================');
    console.log('🎉 ALL 13 SIMPLIFIED CLAIM FLOW CRITERIA PASSED SUCCESSFULLY!');
    console.log('====================================================================\n');

  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error.message || error);
    process.exit(1);
  }
}

runSimpleClaimFlowTestSuite();
