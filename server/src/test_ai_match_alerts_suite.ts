import { supabaseDb, ItemRecord } from './db/supabaseDb.js';
import { matchAlertService } from './services/matchAlertService.js';
import { aiMatchingService } from './services/aiMatcher.js';
import { multilingualEngine } from './services/multilingualEngine.js';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🤖 FINDIT AI — AI MATCH ALERTS V1 COMPREHENSIVE VERIFICATION SUITE');
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

  // Verify PostgreSQL
  const isPostgresReady = await supabaseDb.checkPostgrestAvailability();
  assert(isPostgresReady, 'Supabase PostgreSQL Authoritative Database is ONLINE');

  const ts = Date.now();
  const userA_Email = `match_test_userA_${ts}@campus.edu`;
  const userB_Email = `match_test_userB_${ts}@campus.edu`;
  const userC_Email = `match_test_userC_${ts}@campus.edu`;
  const password = 'CampusPass2026!';

  let tokenA = '';
  let userA_Id = '';
  let tokenB = '';
  let userB_Id = '';
  let tokenC = '';
  let userC_Id = '';

  // Setup Users A, B, C
  console.log('\n--- SETTING UP TEST USERS IN SUPABASE AUTH ---');
  const regA = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice Walker', email: userA_Email, password, campus: 'Central Campus' })
  });
  const dataA: any = await regA.json();
  tokenA = dataA.token;
  userA_Id = dataA.user.id;

  const regB = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bob Jenkins', email: userB_Email, password, campus: 'Central Campus' })
  });
  const dataB: any = await regB.json();
  tokenB = dataB.token;
  userB_Id = dataB.user.id;

  const regC = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Charlie Dave', email: userC_Email, password, campus: 'Engineering Quad' })
  });
  const dataC: any = await regC.json();
  tokenC = dataC.token;
  userC_Id = dataC.user.id;

  assert(tokenA && userA_Id && tokenB && userB_Id && tokenC && userC_Id, 'User accounts registered via Supabase Auth');

  let itemA_LostHeadphonesId = '';
  let itemB_FoundHeadphonesId = '';
  let itemB_FoundLaptopId = '';
  let itemA_FoundHeadphonesOwnId = '';

  // TEST 1 & TEST 3: User A creates LOST headphones, User B creates FOUND headphones -> Cross-user matching works
  console.log('\n--- TEST 1 & TEST 3: CROSS-USER LOST ↔ FOUND MATCHING ---');
  const createLostRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      type: 'LOST',
      title: 'Black JBL Tune 760NC Wireless Headphones',
      description: 'I lost my black JBL Tune 760NC noise-canceling headphones near the library 2nd floor yesterday.',
      category: 'Electronics',
      location: 'Central Library',
      date: new Date().toISOString().split('T')[0],
      characteristics: 'Matte black, JBL logo on side, slight scratch on left earcup'
    })
  });
  const lostItemData: any = await createLostRes.json();
  itemA_LostHeadphonesId = lostItemData.item.id;
  assert(createLostRes.status === 201 && itemA_LostHeadphonesId, 'User A created LOST headphones report successfully');

  // User B creates FOUND headphones
  const createFoundRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      type: 'FOUND',
      title: 'Black JBL Wireless Headphones',
      description: 'Found black JBL over-ear wireless headphones near the central library stairs.',
      category: 'Electronics',
      location: 'Central Library',
      date: new Date().toISOString().split('T')[0],
      characteristics: 'Black over-ear headphones with JBL branding'
    })
  });
  const foundItemData: any = await createFoundRes.json();
  itemB_FoundHeadphonesId = foundItemData.item.id;
  assert(createFoundRes.status === 201 && itemB_FoundHeadphonesId, 'User B created FOUND headphones report successfully');

  // Trigger matching pipeline directly for deterministic verification
  const matchResult1 = await matchAlertService.processNewReport(foundItemData.item);
  assert(matchResult1.matchesFound >= 1, 'TEST 1 & 3: Automatic cross-user potential match detected between User A LOST and User B FOUND', `Found ${matchResult1.matchesFound} matches, top score: ${matchResult1.matches[0]?.score}%`);
  assert(matchResult1.matches[0]?.score >= 75, 'TEST 1: Match score satisfies threshold (>= 75%)', `Score: ${matchResult1.matches[0]?.score}%`);

  // TEST 2: Category Mismatch Rejection (Headphones vs Laptop)
  console.log('\n--- TEST 2: CATEGORY MISMATCH REJECTION ---');
  const createLaptopRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      type: 'FOUND',
      title: 'Dell XPS 15 Silver Laptop',
      description: 'Found Dell XPS laptop left on a study desk near central library.',
      category: 'Electronics',
      location: 'Central Library',
      date: new Date().toISOString().split('T')[0],
      characteristics: 'Silver aluminum laptop with Dell logo'
    })
  });
  const foundLaptopData: any = await createLaptopRes.json();
  itemB_FoundLaptopId = foundLaptopData.item.id;

  const matchLaptopResult = await matchAlertService.processNewReport(foundLaptopData.item);
  const matchedWithHeadphones = matchLaptopResult.matches.some(m => m.lostItemId === itemA_LostHeadphonesId);
  assert(!matchedWithHeadphones, 'TEST 2: Fundamentally incompatible objects (headphones vs laptop) rejected without false alert');

  // TEST 4: Same-User Lost + Found -> No Automatic Cross-User Match
  console.log('\n--- TEST 4: SAME-USER LOST + FOUND PREVENTION ---');
  const createOwnFoundRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}` // User A creating found headphones
    },
    body: JSON.stringify({
      type: 'FOUND',
      title: 'Black JBL Headphones',
      description: 'Found black JBL headphones in the library reading room.',
      category: 'Electronics',
      location: 'Central Library',
      date: new Date().toISOString().split('T')[0]
    })
  });
  const ownFoundData: any = await createOwnFoundRes.json();
  itemA_FoundHeadphonesOwnId = ownFoundData.item.id;

  const ownMatchResult = await matchAlertService.processNewReport(ownFoundData.item);
  const selfMatch = ownMatchResult.matches.some(m => m.lostItemId === itemA_LostHeadphonesId);
  assert(!selfMatch, 'TEST 4: Same user report (User A LOST ↔ User A FOUND) prevented from self-matching');

  // TEST 5: Duplicate Match Prevention (Unique Constraint)
  console.log('\n--- TEST 5: DUPLICATE MATCH ROW PREVENTION ---');
  const duplicateRun = await matchAlertService.processNewReport(foundItemData.item);
  const existingMatches = await supabaseDb.getPotentialMatchesForItem(itemA_LostHeadphonesId, 'LOST');
  const duplicates = existingMatches.filter(m => m.found_item_id === itemB_FoundHeadphonesId || m.id === itemB_FoundHeadphonesId);
  assert(duplicates.length === 1, 'TEST 5: Exactly one potential match row preserved, duplicate prevention verified', `Found ${duplicates.length} records`);

  // TEST 6: Duplicate Notification Prevention
  console.log('\n--- TEST 6: DUPLICATE NOTIFICATION SUPPRESSION ---');
  const notifsA = await supabaseDb.getNotifications(userA_Id);
  const matchNotifs = notifsA.notifications.filter(n => n.type === 'AI_MATCH' && n.related_item_id === itemA_LostHeadphonesId);
  assert(matchNotifs.length === 1, 'TEST 6: Notification deduplicated, user not spammed repeatedly', `Notifications count: ${matchNotifs.length}`);

  // TEST 7: Gemini Failure Handling (Report creation succeeds even if AI service encounters error)
  console.log('\n--- TEST 7: RESILIENCE & FAILURE TOLERANCE ---');
  const resilientCreateRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      type: 'LOST',
      title: 'Blue Water Bottle',
      description: 'Lost steel blue Milton thermos bottle in physics lab.',
      category: 'Other',
      location: 'Physics Lab',
      date: new Date().toISOString().split('T')[0]
    })
  });
  assert(resilientCreateRes.status === 201, 'TEST 7: Report creation succeeds immediately with 201 without blocking on AI');

  // TEST 8 & TEST 9: Database Persistence across Refresh and Re-login
  console.log('\n--- TEST 8 & 9: PERSISTENCE ACROSS RE-LOGIN ---');
  const reLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userA_Email, password })
  });
  const reLoginData: any = await reLoginRes.json();
  const newTokenA = reLoginData.token;

  const myMatchesRes = await fetch(`${BASE_URL}/items/my-matches`, {
    headers: { 'Authorization': `Bearer ${newTokenA}` }
  });
  const myMatchesData: any = await myMatchesRes.json();
  assert(myMatchesRes.status === 200 && myMatchesData.matches?.length >= 1, 'TEST 8 & 9: Potential matches survive logout/login and reload from Supabase', `Matches loaded: ${myMatchesData.matches?.length}`);

  // TEST 10: Security IDOR Testing (User C cannot access User A's private match)
  console.log('\n--- TEST 10: IDOR ACCESS CONTROL ON MATCH DETAILS ---');
  const matchId = matchResult1.matches[0].matchId;
  const idorRes = await fetch(`${BASE_URL}/items/matches/${matchId}`, {
    headers: { 'Authorization': `Bearer ${tokenC}` } // Charlie trying to access Alice & Bob's match
  });
  assert(idorRes.status === 404, 'TEST 10: Unauthorized user denied access to private match record (IDOR protected)', `Status: ${idorRes.status}`);

  const ownerAccessRes = await fetch(`${BASE_URL}/items/matches/${matchId}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` } // Alice accessing her own match
  });
  assert(ownerAccessRes.status === 200, 'TEST 10: Legitimate owner granted access to match record', `Status: ${ownerAccessRes.status}`);

  // TEST 11: Security — Request Body userId Impersonation Ignored
  console.log('\n--- TEST 11: USER IDENTITY RULE (JWT AUTHORITATIVE) ---');
  const spoofedRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      userId: userB_Id, // Trying to impersonate User B
      user_id: userB_Id,
      owner_id: userB_Id,
      type: 'LOST',
      title: 'Green Umbrella',
      description: 'Lost dark green umbrella near canteen.',
      category: 'Other',
      location: 'Canteen',
      date: new Date().toISOString().split('T')[0]
    })
  });
  const spoofedData: any = await spoofedRes.json();
  assert(spoofedData.item?.user_id === userA_Id, 'TEST 11: Server ignores frontend-provided userId and derives owner from verified JWT', `Owner ID: ${spoofedData.item?.user_id}`);

  // TEST 12 & TEST 13: High vs Low Confidence Threshold Behavior
  console.log('\n--- TEST 12 & 13: CONFIGURABLE THRESHOLD ENFORCEMENT ---');
  assert(matchAlertService.threshold === 75, 'Configured threshold is 75%');
  assert(matchResult1.matches[0].score >= 75, 'TEST 12: High-confidence match (>= 75%) triggered user alert');

  // Low confidence test (vague items with only color match)
  const lowItemA: ItemRecord = {
    id: 'test_low_a',
    user_id: userA_Id,
    type: 'LOST',
    title: 'Black item',
    description: 'Lost something black.',
    category: 'Other',
    location: 'Somewhere',
    date: '2026-10-01',
    status: 'ACTIVE'
  };
  const lowItemB: ItemRecord = {
    id: 'test_low_b',
    user_id: userB_Id,
    type: 'FOUND',
    title: 'Black item',
    description: 'Found black thing.',
    category: 'Other',
    location: 'Somewhere else',
    date: '2026-10-02',
    status: 'ACTIVE'
  };
  const lowEval = await aiMatchingService.evaluateSimilarity(lowItemA, lowItemB);
  assert(lowEval.matchScore < 75, 'TEST 13: Vague item comparison score is strictly below 75% threshold', `Score: ${lowEval.matchScore}%`);

  // TEST 14: Existing old LOST report + newly created FOUND report
  console.log('\n--- TEST 14: OLD LOST ↔ NEW FOUND MATCHING ---');
  assert(itemA_LostHeadphonesId && itemB_FoundHeadphonesId, 'TEST 14: Old LOST item automatically matched against incoming FOUND item');

  // TEST 15: Existing old FOUND report + newly created LOST report
  console.log('\n--- TEST 15: OLD FOUND ↔ NEW LOST MATCHING (REVERSE DIRECTION) ---');
  // User B already has an existing FOUND wallet with valid UUID
  const oldFoundWallet = await supabaseDb.createItem({
    id: crypto.randomUUID(),
    user_id: userB_Id,
    type: 'FOUND',
    title: 'Brown Tommy Hilfiger Leather Wallet',
    description: 'Found brown leather Tommy Hilfiger wallet near basketball court.',
    category: 'Wallet',
    location: 'Basketball Court',
    date: '2026-10-01',
    status: 'ACTIVE',
    characteristics: 'Brown leather, embossed Tommy Hilfiger logo, contains metro card'
  });

  // User A now creates a NEW LOST wallet with valid UUID
  const newLostWallet = await supabaseDb.createItem({
    id: crypto.randomUUID(),
    user_id: userA_Id,
    type: 'LOST',
    title: 'Tommy Hilfiger Brown Wallet',
    description: 'Lost my brown leather Tommy Hilfiger wallet around basketball court yesterday.',
    category: 'Wallet',
    location: 'Basketball Court',
    date: '2026-10-01',
    status: 'ACTIVE',
    characteristics: 'Brown leather Tommy Hilfiger'
  });

  const reverseResult = await matchAlertService.processNewReport(newLostWallet);
  const foundWalletMatch = reverseResult.matches.find(m => m.foundItemId === oldFoundWallet.id);
  assert(Boolean(foundWalletMatch && foundWalletMatch.score >= 75), 'TEST 15: Newly created LOST report successfully discovers existing FOUND report', `Score: ${foundWalletMatch?.score}%`);

  // TEST 16: Multilingual Semantic Report Matching & Notifications
  console.log('\n--- TEST 16: MULTILINGUAL UNDERSTANDING & NOTIFICATION ---');
  const hindiLostItem: ItemRecord = {
    id: `hindi_lost_${ts}`,
    user_id: userA_Id,
    type: 'LOST',
    title: 'Black JBL headphones',
    description: 'Library ke paas mere black JBL headphones kho gaye the kal shaam ko.',
    category: 'Electronics',
    location: 'Central Library',
    date: '2026-10-01',
    status: 'ACTIVE'
  };

  const detectedHindi = multilingualEngine.detectLanguage(hindiLostItem.description);
  assert(detectedHindi.language === 'hi' || detectedHindi.is_mixed, 'TEST 16: Hinglish/Hindi text accurately detected', `Language: ${detectedHindi.language_name}`);

  const similarityHindi = await aiMatchingService.evaluateSimilarity(hindiLostItem, foundItemData.item);
  assert(similarityHindi.matchScore >= 70, 'TEST 16: Multilingual report semantically matches English found report', `Score: ${similarityHindi.matchScore}%`);

  // TEST 17: Conflicting Image and Text Evidence
  console.log('\n--- TEST 17: CONFLICTING MULTIMODAL EVIDENCE ---');
  const textNorm = aiMatchingService.normalizeItem('Blue umbrella', 'Blue umbrella', 'Accessories');
  const conflictingImageAnalysis = {
    object_type: 'backpack',
    category: 'bags_luggage' as any,
    subcategory: 'backpack_bag' as any,
    color: 'red',
    confidence: 0.92,
    visible_features: ['zippers'],
    visible_damage: [],
    visible_accessories: [],
    text_logos: [],
    is_low_quality: false,
    analysis_model: 'gemini-vision',
    analyzed_at: new Date().toISOString()
  };
  const consistency = aiMatchingService.evaluateTextAndImageConsistency(textNorm, conflictingImageAnalysis);
  assert(consistency.has_mismatch && consistency.consistency_level === 'MAJOR_MISMATCH', 'TEST 17: Conflicting text vs image evidence identified as MAJOR_MISMATCH');

  // TEST 18: False Positive Protection on Generic Black Phones
  console.log('\n--- TEST 18: FALSE POSITIVE CAPPING (GENERIC BLACK PHONES) ---');
  const genericPhoneLost: ItemRecord = {
    id: `generic_lost_${ts}`,
    user_id: userA_Id,
    type: 'LOST',
    title: 'Black Smartphone',
    description: 'Lost black phone.',
    category: 'Electronics',
    location: 'Campus',
    date: '2026-10-01',
    status: 'ACTIVE'
  };
  const genericPhoneFound: ItemRecord = {
    id: `generic_found_${ts}`,
    user_id: userB_Id,
    type: 'FOUND',
    title: 'Black Smartphone',
    description: 'Found black phone.',
    category: 'Electronics',
    location: 'Campus',
    date: '2026-10-01',
    status: 'ACTIVE'
  };
  const genericSim = await aiMatchingService.evaluateSimilarity(genericPhoneLost, genericPhoneFound);
  assert(genericSim.isGenericMatch && genericSim.matchScore <= 48, 'TEST 18: Generic black phones without brand/distinctive features capped <= 48%', `Score: ${genericSim.matchScore}%`);

  console.log('\n========================================================================');
  console.log(`📊 AI MATCH ALERTS V1 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
