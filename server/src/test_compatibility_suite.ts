import { aiMatchingService, ItemRecord } from './services/aiMatcher.js';

async function runCompatibilityTestSuite() {
  console.log('================================================================');
  console.log('FINDIT AI — HARD ITEM COMPATIBILITY & ZERO FALSE MATCHES TEST SUITE');
  console.log('================================================================\n');

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

  // Helpers to create mock items
  const makeItem = (
    id: string,
    type: 'LOST' | 'FOUND',
    title: string,
    description: string,
    category: string = 'Electronics',
    location: string = 'Main University Library',
    date: string = '2026-09-19',
    characteristics?: string
  ): ItemRecord => ({
    id,
    user_id: `user-${id}`,
    type,
    title,
    description,
    category,
    location,
    date,
    status: 'ACTIVE',
    characteristics
  });

  console.log('--- SUITE 1: 10 CORE SPECIFICATION TEST CASES ---\n');

  // TEST 1: Lost Samsung phone vs Found Samsung phone -> Compatible (>80%)
  const lost1 = makeItem('l1', 'LOST', 'Samsung Galaxy phone', 'Black Samsung Galaxy S23 with cracked screen', 'Electronics');
  const found1 = makeItem('f1', 'FOUND', 'Samsung Galaxy phone', 'Found black Samsung Galaxy S23 phone with cracked screen', 'Electronics');
  const res1 = await aiMatchingService.evaluateSimilarity(lost1, found1);
  assert(res1.isCompatible && res1.matchScore >= 80, 'TEST 1: Lost Samsung phone vs Found Samsung phone', `Compatible: ${res1.isCompatible}, Score: ${res1.matchScore}%`);

  // TEST 2: Lost Samsung phone vs Found iPhone -> Compatible smartphone class (different brand)
  const lost2 = makeItem('l2', 'LOST', 'Samsung Galaxy S23', 'Black Samsung Galaxy phone lost near library', 'Electronics');
  const found2 = makeItem('f2', 'FOUND', 'iPhone 15', 'Black Apple iPhone 15 found near library', 'Electronics');
  const res2 = await aiMatchingService.evaluateSimilarity(lost2, found2);
  assert(res2.isCompatible && res2.matchScore > 40 && res2.matchScore < res1.matchScore, 'TEST 2: Lost Samsung phone vs Found iPhone', `Compatible: ${res2.isCompatible}, Score: ${res2.matchScore}% (reflects brand difference)`);

  // TEST 3: Lost Samsung phone vs Found Dell laptop -> 0% (Hard Incompatible)
  const lost3 = makeItem('l3', 'LOST', 'Black Samsung phone', 'Black Samsung Galaxy phone with cracked screen lost at library', 'Electronics');
  const found3 = makeItem('f3', 'FOUND', 'Black Dell laptop', 'Black Dell XPS laptop computer found at library', 'Electronics');
  const res3 = await aiMatchingService.evaluateSimilarity(lost3, found3);
  assert(!res3.isCompatible && res3.matchScore === 0, 'TEST 3: Lost Samsung phone vs Found Dell laptop', `Compatible: ${res3.isCompatible}, Score: ${res3.matchScore}% (Hard Gate = 0)`);

  // TEST 4: Lost Samsung phone vs Found college document -> 0% (Hard Incompatible)
  const lost4 = makeItem('l4', 'LOST', 'Black Samsung phone', 'Black Samsung Galaxy phone lost at canteen', 'Electronics');
  const found4 = makeItem('f4', 'FOUND', 'College student ID document', 'Student ID card and paper folder found at canteen', 'Documents');
  const res4 = await aiMatchingService.evaluateSimilarity(lost4, found4);
  assert(!res4.isCompatible && res4.matchScore === 0, 'TEST 4: Lost Samsung phone vs Found college document', `Compatible: ${res4.isCompatible}, Score: ${res4.matchScore}% (Hard Gate = 0)`);

  // TEST 5: Lost wallet vs Found laptop -> 0% (Hard Incompatible)
  const lost5 = makeItem('l5', 'LOST', 'Black leather wallet', 'Black wallet containing cards lost at library', 'Wallet');
  const found5 = makeItem('f5', 'FOUND', 'Dell laptop', 'Black Dell laptop computer found at library', 'Electronics');
  const res5 = await aiMatchingService.evaluateSimilarity(lost5, found5);
  assert(!res5.isCompatible && res5.matchScore === 0, 'TEST 5: Lost wallet vs Found laptop', `Compatible: ${res5.isCompatible}, Score: ${res5.matchScore}% (Hard Gate = 0)`);

  // TEST 6: Lost backpack vs Found backpack -> Compatible (>70%)
  const lost6 = makeItem('l6', 'LOST', 'Black North Face backpack', 'Black North Face backpack lost at student center', 'Bags');
  const found6 = makeItem('f6', 'FOUND', 'North Face backpack', 'Black North Face backpack with school books found at student center', 'Bags');
  const res6 = await aiMatchingService.evaluateSimilarity(lost6, found6);
  assert(res6.isCompatible && res6.matchScore >= 70, 'TEST 6: Lost backpack vs Found backpack', `Compatible: ${res6.isCompatible}, Score: ${res6.matchScore}%`);

  // TEST 7: Lost black Samsung phone vs Found blue Samsung phone -> Compatible, lower score due to color mismatch
  const lost7 = makeItem('l7', 'LOST', 'Black Samsung phone', 'Black Samsung Galaxy phone lost at gym', 'Electronics');
  const found7 = makeItem('f7', 'FOUND', 'Blue Samsung phone', 'Blue Samsung Galaxy phone found at gym', 'Electronics');
  const res7 = await aiMatchingService.evaluateSimilarity(lost7, found7);
  assert(res7.isCompatible && res7.matchScore < res1.matchScore, 'TEST 7: Lost black Samsung phone vs Found blue Samsung phone', `Compatible: ${res7.isCompatible}, Score: ${res7.matchScore}% (Color mismatch penalty applied)`);

  // TEST 8: Lost Samsung Galaxy S23 vs Found Samsung Galaxy S23 with cracked screen -> High match (>80%)
  const lost8 = makeItem('l8', 'LOST', 'Samsung Galaxy S23', 'Black Samsung Galaxy S23 with cracked screen lost at science hall', 'Electronics', 'Science Building', '2026-09-19', 'Cracked screen near front camera');
  const found8 = makeItem('f8', 'FOUND', 'Samsung Galaxy S23', 'Black Samsung Galaxy S23 phone with cracked screen found at science hall', 'Electronics', 'Science Building', '2026-09-19', 'Cracked front glass display');
  const res8 = await aiMatchingService.evaluateSimilarity(lost8, found8);
  assert(res8.isCompatible && res8.matchScore >= 80, 'TEST 8: Lost Samsung Galaxy S23 vs Found Galaxy S23 with cracked screen', `Compatible: ${res8.isCompatible}, Score: ${res8.matchScore}% (High match)`);

  // TEST 9: Lost iPhone vs Found Samsung phone -> Compatible smartphone class, score reflects brand difference
  const lost9 = makeItem('l9', 'LOST', 'Silver iPhone 15', 'Silver Apple iPhone lost at cafeteria', 'Electronics');
  const found9 = makeItem('f9', 'FOUND', 'Silver Samsung Galaxy', 'Silver Samsung Galaxy smartphone found at cafeteria', 'Electronics');
  const res9 = await aiMatchingService.evaluateSimilarity(lost9, found9);
  assert(res9.isCompatible && res9.matchScore > 40 && res9.matchScore < 75, 'TEST 9: Lost iPhone vs Found Samsung phone', `Compatible: ${res9.isCompatible}, Score: ${res9.matchScore}% (Brand difference reflected, not zero)`);

  // TEST 10: Lost phone vs Found phone case -> 0% (Hard Incompatible)
  const lost10 = makeItem('l10', 'LOST', 'Samsung Galaxy phone', 'Black Samsung Galaxy smartphone lost at library', 'Electronics');
  const found10 = makeItem('f10', 'FOUND', 'Phone case cover', 'Black silicone phone case for Samsung phone found at library', 'Accessories');
  const res10 = await aiMatchingService.evaluateSimilarity(lost10, found10);
  assert(!res10.isCompatible && res10.matchScore === 0, 'TEST 10: Lost phone vs Found phone case', `Compatible: ${res10.isCompatible}, Score: ${res10.matchScore}% (Hard Gate = 0)`);

  console.log('\n--- SUITE 2: EDGE CASES & SYSTEM RULES ---\n');

  // TEST 11: Lost wallet vs Found wallet -> Compatible
  const lost11 = makeItem('l11', 'LOST', 'Brown leather wallet', 'Brown leather wallet with student ID and credit card', 'Wallet');
  const found11 = makeItem('f11', 'FOUND', 'Brown wallet', 'Brown leather wallet found at food court', 'Wallet');
  const res11 = await aiMatchingService.evaluateSimilarity(lost11, found11);
  assert(res11.isCompatible && res11.matchScore >= 60, 'TEST 11: Lost wallet vs Found wallet', `Compatible: ${res11.isCompatible}, Score: ${res11.matchScore}%`);

  // TEST 12: Lost car keys vs Found MacBook laptop -> 0% (Hard Incompatible)
  const lost12 = makeItem('l12', 'LOST', 'Car keys', 'Honda car key fob with keychain', 'Keys');
  const found12 = makeItem('f12', 'FOUND', 'MacBook Pro', 'Silver Apple MacBook Pro laptop', 'Electronics');
  const res12 = await aiMatchingService.evaluateSimilarity(lost12, found12);
  assert(!res12.isCompatible && res12.matchScore === 0, 'TEST 12: Lost car keys vs Found MacBook laptop', `Compatible: ${res12.isCompatible}, Score: ${res12.matchScore}% (Hard Gate = 0)`);

  // TEST 13: Self-type matching rejection (LOST vs LOST, FOUND vs FOUND)
  const lostA = makeItem('la', 'LOST', 'Black Samsung Galaxy phone', 'Lost black phone', 'Electronics');
  const lostB = makeItem('lb', 'LOST', 'Black Samsung Galaxy phone', 'Lost black phone', 'Electronics');
  const resSelf = await aiMatchingService.evaluateSimilarity(lostA, lostB);
  assert(resSelf.matchScore === 0 && !resSelf.isCompatible, 'TEST 13: Self-type matching rejection (LOST vs LOST = 0)', `Score: ${resSelf.matchScore}%`);

  // TEST 14: Natural Language Query Search Compatibility Pre-Filter
  const query = 'Black Samsung Galaxy phone with cracked screen';
  const intent = await aiMatchingService.extractQueryIntent(query);
  assert(intent.subcategory === 'mobile_phone' && intent.brand === 'Samsung', 'TEST 14A: NLP Intent Normalization for Search Query', `Subcategory: ${intent.subcategory}, Brand: ${intent.brand}`);

  const candidates = [
    makeItem('c1', 'FOUND', 'Samsung Galaxy S23', 'Black Samsung Galaxy phone with cracked display', 'Electronics'),
    makeItem('c2', 'FOUND', 'Dell XPS laptop', 'Black Dell laptop computer with charger', 'Electronics'),
    makeItem('c3', 'FOUND', 'College student ID', 'Student ID card for science student', 'Documents'),
    makeItem('c4', 'FOUND', 'Leather wallet', 'Black leather wallet with cards', 'Wallet'),
    makeItem('c5', 'FOUND', 'Phone case', 'Black protective phone case', 'Accessories')
  ];

  const searchResults = await aiMatchingService.evaluateNaturalLanguageMatches(query, intent, candidates);
  const resultItemIds = searchResults.map(r => r.item.id);
  assert(
    resultItemIds.includes('c1') && !resultItemIds.includes('c2') && !resultItemIds.includes('c3') && !resultItemIds.includes('c4') && !resultItemIds.includes('c5'),
    'TEST 14B: Search Results Hard Compatibility Filtering (Zero False Matches)',
    `Returned items: [${resultItemIds.join(', ')}] — Only compatible phone returned!`
  );

  console.log('\n================================================================');
  console.log(`TEST RESULTS SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCompatibilityTestSuite().catch(err => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
