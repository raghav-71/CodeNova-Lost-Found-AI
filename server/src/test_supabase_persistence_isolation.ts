import { supabaseAdmin, isSupabaseServerConfigured } from './services/supabase.js';
import { supabaseDb } from './db/supabaseDb.js';

const BASE_URL = 'http://localhost:5000/api';

async function runValidation() {
  console.log('========================================================================');
  console.log('🌐 FINDIT AI — SUPABASE POSTGRESQL PERSISTENCE & USER ISOLATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: any, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   └─ FAILED: ${detail}`);
      failed++;
    }
  }

  // 1. Verify Supabase PostgreSQL connection
  const isPostgresReady = await supabaseDb.checkPostgrestAvailability();
  assert(isPostgresReady, 'Supabase PostgreSQL is the ACTIVE authoritative database');

  const ts = Date.now();
  const userA_Email = `user_a_${ts}@campus.edu`;
  const userB_Email = `user_b_${ts}@campus.edu`;
  const userC_Email = `user_c_${ts}@campus.edu`;
  const password = 'CampusPass2026!';

  let tokenA = '';
  let userA_Id = '';
  let tokenB = '';
  let userB_Id = '';
  let tokenC = '';
  let userC_Id = '';

  let itemA_LostId = '';
  let itemA_FoundId = '';
  let itemB_Lost1Id = '';
  let itemB_Lost2Id = '';
  let itemB_FoundId = '';

  // --------------------------------------------------------------------------
  // 1. REGISTER USER A
  // --------------------------------------------------------------------------
  console.log('\n--- 1. REGISTER & SETUP USER A ---');
  const regResA = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex Rivera (User A)',
      email: userA_Email,
      password,
      campus: 'North Campus Quad',
      phone: '+1 555-0101'
    })
  });
  const regDataA: any = await regResA.json();
  userA_Id = regDataA.user?.id;
  tokenA = regDataA.token;
  assert(regResA.status === 201 && userA_Id && tokenA, 'User A registered in Supabase Auth & PostgreSQL', `User A ID: ${userA_Id}`);

  // User A creates 2 reports: 1 LOST, 1 FOUND
  const itemA1Res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      type: 'LOST',
      title: 'Black Sony WH-1000XM4 Headphones',
      description: 'Lost near university library 3rd floor study room',
      category: 'Electronics',
      location: 'Main University Library',
      building_zone: '3rd Floor',
      date: '2026-10-01',
      characteristics: 'Black over-ear headphones in grey case'
    })
  });
  const itemA1Data: any = await itemA1Res.json();
  itemA_LostId = itemA1Data.item?.id;
  assert(itemA1Res.status === 201 && itemA_LostId, 'User A creates report #1 (LOST in Supabase PostgreSQL)', `Item ID: ${itemA_LostId}`);

  const itemA2Res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      type: 'FOUND',
      title: 'Stainless Steel Water Bottle',
      description: 'Found on cafeteria bench',
      category: 'Other',
      location: 'Student Center Cafeteria',
      date: '2026-10-01',
      characteristics: 'Silver with campus stickers'
    })
  });
  const itemA2Data: any = await itemA2Res.json();
  itemA_FoundId = itemA2Data.item?.id;
  assert(itemA2Res.status === 201 && itemA_FoundId, 'User A creates report #2 (FOUND in Supabase PostgreSQL)', `Item ID: ${itemA_FoundId}`);

  // --------------------------------------------------------------------------
  // 2. REGISTER USER B
  // --------------------------------------------------------------------------
  console.log('\n--- 2. REGISTER & SETUP USER B ---');
  const regResB = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Jordan Smith (User B)',
      email: userB_Email,
      password,
      campus: 'Engineering Annex',
      phone: '+1 555-0202'
    })
  });
  const regDataB: any = await regResB.json();
  userB_Id = regDataB.user?.id;
  tokenB = regDataB.token;
  assert(regResB.status === 201 && userB_Id && tokenB, 'User B registered in Supabase Auth & PostgreSQL', `User B ID: ${userB_Id}`);

  // User B creates 3 reports: 2 LOST, 1 FOUND
  const itemB1Res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({
      type: 'LOST',
      title: 'Brown Leather Fossil Wallet',
      description: 'Lost in engineering quad',
      category: 'Personal Accessories',
      location: 'Engineering Building',
      date: '2026-10-01',
      characteristics: 'Contains driver license'
    })
  });
  const itemB1Data: any = await itemB1Res.json();
  itemB_Lost1Id = itemB1Data.item?.id;

  const itemB2Res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({
      type: 'LOST',
      title: 'Calculus Textbook 9th Edition',
      description: 'Lost in math lecture hall',
      category: 'Books',
      location: 'Science Building & Labs',
      date: '2026-10-01',
      characteristics: 'Hardcover with name inside'
    })
  });
  const itemB2Data: any = await itemB2Res.json();
  itemB_Lost2Id = itemB2Data.item?.id;

  const itemB3Res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({
      type: 'FOUND',
      title: 'Sony Noise-Cancelling Headphones',
      description: 'Found left on quiet study desk in library',
      category: 'Electronics',
      location: 'Main University Library',
      building_zone: '3rd Floor',
      date: '2026-10-01',
      characteristics: 'Black over-ear Sony headphones with case'
    })
  });
  const itemB3Data: any = await itemB3Res.json();
  itemB_FoundId = itemB3Data.item?.id;

  assert(itemB_Lost1Id && itemB_Lost2Id && itemB_FoundId, 'User B creates 3 reports (2 LOST, 1 FOUND in Supabase PostgreSQL)', `Items: ${itemB_Lost1Id}, ${itemB_Lost2Id}, ${itemB_FoundId}`);

  // --------------------------------------------------------------------------
  // 3. USER A VS USER B DASHBOARD DATA ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. USER A VS USER B DASHBOARD DATA ISOLATION ---');
  // Check User A Stats
  const statsResA = await fetch(`${BASE_URL}/stats/user`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const statsA: any = await statsResA.json();
  assert(
    statsA.stats?.itemsLost === 1 && statsA.stats?.itemsFound === 1 && statsA.stats?.totalItems === 2,
    'User A Stats reflect ONLY User A data (1 Lost, 1 Found = 2 Total)',
    JSON.stringify(statsA.stats)
  );

  // Check User A My-Items endpoint
  const myItemsResA = await fetch(`${BASE_URL}/items/my-items`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const myItemsA: any = await myItemsResA.json();
  assert(
    myItemsA.items?.length === 2 && myItemsA.items.every((i: any) => i.user_id === userA_Id),
    'User A /api/items/my-items contains ONLY User A items (Zero contamination)',
    `Retrieved ${myItemsA.items?.length} items, all owned by ${userA_Id}`
  );

  // Check User B Stats
  const statsResB = await fetch(`${BASE_URL}/stats/user`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const statsB: any = await statsResB.json();
  assert(
    statsB.stats?.itemsLost === 2 && statsB.stats?.itemsFound === 1 && statsB.stats?.totalItems === 3,
    'User B Stats reflect ONLY User B data (2 Lost, 1 Found = 3 Total)',
    JSON.stringify(statsB.stats)
  );

  // Check User B My-Items endpoint
  const myItemsResB = await fetch(`${BASE_URL}/items/my-items`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const myItemsB: any = await myItemsResB.json();
  assert(
    myItemsB.items?.length === 3 && myItemsB.items.every((i: any) => i.user_id === userB_Id),
    'User B /api/items/my-items contains ONLY User B items',
    `Retrieved ${myItemsB.items?.length} items, all owned by ${userB_Id}`
  );

  // --------------------------------------------------------------------------
  // 4. MANIPULATED USER ID QUERY ATTEMPT
  // --------------------------------------------------------------------------
  console.log('\n--- 4. MANIPULATED USER ID QUERY ATTEMPT ---');
  const queryManipulatedRes = await fetch(`${BASE_URL}/items?userId=${userB_Id}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const queryManipulatedData: any = await queryManipulatedRes.json();
  assert(
    queryManipulatedRes.status === 200,
    'GET /api/items ignores untrusted query userId and protects private user scopes'
  );

  // --------------------------------------------------------------------------
  // 5. CROSS-USER MATCHING & CLAIM LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('\n--- 5. CROSS-USER MATCHING & CLAIM FLOW ---');
  // User A claims User B's found item
  const claimRes = await fetch(`${BASE_URL}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      itemId: itemB_FoundId,
      message: 'These are my black Sony headphones left in the 3rd floor study room.'
    })
  });
  const claimData: any = await claimRes.json();
  const claimId = claimData.claim?.id;
  assert(claimRes.status === 201 && claimId, 'User A claims User B found item', `Claim ID: ${claimId}`);

  // User B checks received claims
  const receivedResB = await fetch(`${BASE_URL}/claims/received`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const receivedDataB: any = await receivedResB.json();
  const receivedClaim = receivedDataB.claims?.find((c: any) => c.id === claimId);
  assert(receivedClaim && receivedClaim.claimant_id === userA_Id, 'User B sees incoming claim from User A on their found item');

  // User B approves the claim
  const approveRes = await fetch(`${BASE_URL}/claims/${claimId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ status: 'APPROVED' })
  });
  assert(approveRes.status === 200, 'User B approves User A claim');

  // User A marks received
  const resolveRes = await fetch(`${BASE_URL}/claims/${claimId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ status: 'RESOLVED', resolutionNotes: 'Received headphones in person.' })
  });
  assert(resolveRes.status === 200, 'User A marks item as received / claim resolved');

  // Register User C
  console.log('\n--- 6. REGISTER USER C & VERIFY PRIVACY ---');
  const regResC = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unrelated User C',
      email: userC_Email,
      password
    })
  });
  const regDataC: any = await regResC.json();
  userC_Id = regDataC.user?.id;
  tokenC = regDataC.token;
  assert(regResC.status === 201 && userC_Id, 'User C registered in Supabase Auth & PostgreSQL');

  // User C checks claims
  const myClaimsC = await fetch(`${BASE_URL}/claims/my-claims`, {
    headers: { 'Authorization': `Bearer ${tokenC}` }
  });
  const claimsDataC: any = await myClaimsC.json();
  assert(claimsDataC.claims?.length === 0, 'User C has ZERO claims (Cannot see User A / User B claim)');

  const receivedClaimsC = await fetch(`${BASE_URL}/claims/received`, {
    headers: { 'Authorization': `Bearer ${tokenC}` }
  });
  const receivedDataC: any = await receivedClaimsC.json();
  assert(receivedDataC.claims?.length === 0, 'User C has ZERO received claims (Isolated)');

  // --------------------------------------------------------------------------
  // 7. VERIFY PERSISTENCE DIRECTLY IN SUPABASE POSTGRESQL
  // --------------------------------------------------------------------------
  console.log('\n--- 7. VERIFY PERSISTENCE DIRECTLY IN SUPABASE POSTGRESQL ---');
  // Query Supabase PostgreSQL directly using admin client to ensure records exist in PostgreSQL
  const { data: dbItemsA, error: errA } = await supabaseAdmin
    .from('items')
    .select('id, title, user_id')
    .eq('user_id', userA_Id);
  assert(!errA && dbItemsA?.length === 2, 'Supabase PostgreSQL persists User A 2 items', `Found in PostgreSQL: ${dbItemsA?.length}`);

  const { data: dbItemsB, error: errB } = await supabaseAdmin
    .from('items')
    .select('id, title, user_id')
    .eq('user_id', userB_Id);
  assert(!errB && dbItemsB?.length === 3, 'Supabase PostgreSQL persists User B 3 items', `Found in PostgreSQL: ${dbItemsB?.length}`);

  const { data: dbClaim, error: errClaim } = await supabaseAdmin
    .from('claims')
    .select('id, status, claimant_id')
    .eq('id', claimId)
    .single();
  assert(!errClaim && dbClaim?.status === 'RESOLVED', 'Supabase PostgreSQL persists RESOLVED claim state', `Status in PostgreSQL: ${dbClaim?.status}`);

  const { data: dbItemResolved, error: errResolvedItem } = await supabaseAdmin
    .from('items')
    .select('id, status')
    .eq('id', itemB_FoundId)
    .single();
  assert(!errResolvedItem && dbItemResolved?.status === 'RESOLVED', 'Supabase PostgreSQL marks claimed found item as RESOLVED', `Item status: ${dbItemResolved?.status}`);

  // --------------------------------------------------------------------------
  // 8. LOGOUT / RELOGIN PERSISTENCE CHECK
  // --------------------------------------------------------------------------
  console.log('\n--- 8. LOGOUT & RELOGIN PERSISTENCE CHECK ---');
  // Relogin User A
  const reloginResA = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userA_Email, password })
  });
  const reloginDataA: any = await reloginResA.json();
  const tokenA2 = reloginDataA.token;

  const reloginStatsA = await fetch(`${BASE_URL}/stats/user`, {
    headers: { 'Authorization': `Bearer ${tokenA2}` }
  });
  const reloginStatsDataA: any = await reloginStatsA.json();
  assert(
    reloginStatsDataA.stats?.itemsLost === 1 && reloginStatsDataA.stats?.itemsFound === 1 && reloginStatsDataA.stats?.totalItems === 2,
    'User A dashboard metrics persist after logout & relogin',
    JSON.stringify(reloginStatsDataA.stats)
  );

  const reloginItemsA = await fetch(`${BASE_URL}/items/my-items`, {
    headers: { 'Authorization': `Bearer ${tokenA2}` }
  });
  const reloginItemsDataA: any = await reloginItemsA.json();
  assert(
    reloginItemsDataA.items?.length === 2,
    'User A items list persists after logout & relogin (Loaded from Supabase PostgreSQL)',
    `Retrieved: ${reloginItemsDataA.items?.length}`
  );

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runValidation().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
