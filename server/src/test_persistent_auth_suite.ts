import { supabaseAdmin, supabasePublic, isSupabaseServerConfigured } from './services/supabase.js';

const BASE_URL = 'http://localhost:5000/api';

async function runPersistentAuthSuite() {
  console.log('====================================================================');
  console.log('FINDIT AI — PERSISTENT AUTH, SECURITY & DASHBOARD ISOLATION SUITE');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   └─ Error: ${detail}`);
      failed++;
    }
  }

  const emailA = `persist_user_a_${Date.now()}@campus.edu`;
  const emailB = `persist_user_b_${Date.now()}@campus.edu`;
  const password = 'CampusSecure2026!';

  let tokenA = '';
  let userAId = '';
  let itemLostAId = '';
  let itemFoundAId = '';

  let tokenB = '';
  let userBId = '';

  // --------------------------------------------------------------------------
  // TEST 1: Register Account A via /api/auth/register
  // --------------------------------------------------------------------------
  console.log('--- PHASE 1: REGISTRATION & LOGIN LIFECYCLE (USER A) ---\n');
  const regResA = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex Rivera',
      email: emailA,
      password,
      campus: 'North Campus • Computer Science',
      phone: '+1 555-0192'
    })
  });

  const regDataA: any = await regResA.json();
  assert(regResA.status === 201 && regDataA.user?.id && regDataA.token, 'TEST 1: Register Account A in Supabase Auth', `User ID: ${regDataA.user?.id}, Token: ${regDataA.token ? 'Present' : 'Missing'}`);
  userAId = regDataA.user?.id;
  tokenA = regDataA.token;

  // --------------------------------------------------------------------------
  // TEST 2 & 3: Logout A then Login Account A with password
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 2: LOGOUT & RELOGIN AUTHENTICATION ---\n');
  // Simulate logout (discard tokenA in client)
  tokenA = '';

  // Relogin Account A
  const loginResA = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailA,
      password
    })
  });

  const loginDataA: any = await loginResA.json();
  assert(loginResA.status === 200 && loginDataA.user?.id === userAId && loginDataA.token, 'TEST 2 & 3: Re-login Account A using exact credentials', `Confirmed User ID: ${loginDataA.user?.id} matches original registration`);
  tokenA = loginDataA.token;

  // --------------------------------------------------------------------------
  // TEST 4: Profile & Session Verification (/api/auth/me)
  // --------------------------------------------------------------------------
  const meResA = await fetch(`${BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const meDataA: any = await meResA.json();
  assert(meResA.status === 200 && meDataA.user?.email === emailA, 'TEST 4: Session Restoration & Profile fetching via Supabase JWT', `Name: ${meDataA.user?.name}, Campus: ${meDataA.user?.campus}`);

  // --------------------------------------------------------------------------
  // TEST 5: Create Real Lost and Found items as User A
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 3: REAL USER DATA CREATION ---\n');
  const lostItemRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      type: 'LOST',
      title: 'Matte Black Dell XPS 15 Laptop',
      description: 'Lost in Science Building Hall B yesterday afternoon with charger',
      category: 'Electronics',
      location: 'Science Building',
      building_zone: 'Hall B',
      date: '2026-09-19',
      characteristics: 'Intel Core i7 sticker on palm rest'
    })
  });
  const lostItemData: any = await lostItemRes.json();
  itemLostAId = lostItemData.item?.id;
  assert(lostItemRes.status === 201 && itemLostAId, 'TEST 5A: User A creates LOST item report', `Item ID: ${itemLostAId}`);

  const foundItemRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      type: 'FOUND',
      title: 'Brown Leather Wallet',
      description: 'Found on 2nd floor table near library study zone',
      category: 'Wallet',
      location: 'Main University Library',
      building_zone: '2nd Floor',
      date: '2026-09-19',
      characteristics: 'Contains student ID'
    })
  });
  const foundItemData: any = await foundItemRes.json();
  itemFoundAId = foundItemData.item?.id;
  assert(foundItemRes.status === 201 && itemFoundAId, 'TEST 5B: User A creates FOUND item report', `Item ID: ${itemFoundAId}`);

  // --------------------------------------------------------------------------
  // TEST 6: User A Personal Dashboard Stats
  // --------------------------------------------------------------------------
  const statsResA = await fetch(`${BASE_URL}/stats/user`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const statsDataA: any = await statsResA.json();
  assert(
    statsDataA.stats?.itemsLost === 1 && statsDataA.stats?.itemsFound === 1 && statsDataA.stats?.totalItems === 2,
    'TEST 6: User A Personal Dashboard Stats reflect real database counts',
    `Lost: ${statsDataA.stats?.itemsLost}, Found: ${statsDataA.stats?.itemsFound}, Total: ${statsDataA.stats?.totalItems}`
  );

  // --------------------------------------------------------------------------
  // TEST 7 & 8: Register Account B (Fresh User)
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 4: USER B ISOLATION & ZERO STATE ---\n');
  const regResB = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Chen',
      email: emailB,
      password,
      campus: 'South Campus • Design',
      phone: '+1 555-0188'
    })
  });
  const regDataB: any = await regResB.json();
  assert(regResB.status === 201 && regDataB.user?.id && regDataB.token, 'TEST 7 & 8: Register Fresh Account B in Supabase Auth', `User B ID: ${regDataB.user?.id}`);
  userBId = regDataB.user?.id;
  tokenB = regDataB.token;

  // --------------------------------------------------------------------------
  // TEST 9 & 10: Verify User B Dashboard has REAL ZERO metrics (No User A Data)
  // --------------------------------------------------------------------------
  const statsResB = await fetch(`${BASE_URL}/stats/user`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const statsDataB: any = await statsResB.json();
  assert(
    statsDataB.stats?.itemsLost === 0 &&
    statsDataB.stats?.itemsFound === 0 &&
    statsDataB.stats?.totalItems === 0 &&
    statsDataB.stats?.activeClaims === 0 &&
    statsDataB.stats?.potentialMatches === 0 &&
    statsDataB.stats?.unreadNotifications === 0,
    'TEST 9 & 10: User B Dashboard starts at clean zero state (No User A data contamination)',
    JSON.stringify(statsDataB.stats)
  );

  // --------------------------------------------------------------------------
  // TEST 11: Attempt User B accessing/modifying User A's private item (IDOR)
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 5: IDOR & AUTHORIZATION SECURITY ---\n');
  const idorEditRes = await fetch(`${BASE_URL}/items/${itemLostAId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({ title: 'Hacked Title' })
  });
  assert(idorEditRes.status === 403, 'TEST 11A: User B cannot modify User A item (403 Forbidden)', `Status: ${idorEditRes.status}`);

  const idorDeleteRes = await fetch(`${BASE_URL}/items/${itemLostAId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  assert(idorDeleteRes.status === 403, 'TEST 11B: User B cannot delete User A item (403 Forbidden)', `Status: ${idorDeleteRes.status}`);

  // --------------------------------------------------------------------------
  // TEST 12 & 13: Relogin User A -> Previous real data remains intact
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 6: USER A PERSISTENCE AFTER MULTIPLE USER SWITCHES ---\n');
  const reloginResA = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailA,
      password
    })
  });
  const reloginDataA: any = await reloginResA.json();
  const tokenA2 = reloginDataA.token;

  const statsResA2 = await fetch(`${BASE_URL}/stats/user`, {
    headers: { 'Authorization': `Bearer ${tokenA2}` }
  });
  const statsDataA2: any = await statsResA2.json();
  assert(
    statsDataA2.stats?.itemsLost === 1 && statsDataA2.stats?.itemsFound === 1 && statsDataA2.stats?.totalItems === 2,
    'TEST 12 & 13: User A real data persists across logouts and user switches',
    `Lost: ${statsDataA2.stats?.itemsLost}, Found: ${statsDataA2.stats?.itemsFound}`
  );

  console.log('\n====================================================================');
  console.log(`TEST RESULTS SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPersistentAuthSuite().catch(err => {
  console.error('Test suite encountered an error:', err);
  process.exit(1);
});
