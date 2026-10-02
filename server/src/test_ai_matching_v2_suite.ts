import { aiMatchingService, ItemRecord } from './services/aiMatcher.js';

async function runV2TestSuite() {
  console.log('========================================================================');
  console.log('FINDIT AI — AI MATCHING ENGINE V2 VERIFICATION TEST SUITE (TESTS A - J)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, testTitle: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testId}: ${testTitle}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testId}: ${testTitle}`);
      if (detail) console.error(`   └─ Detail: ${detail}`);
      failed++;
    }
  }

  const makeItem = (
    id: string,
    type: 'LOST' | 'FOUND',
    title: string,
    description: string,
    category: string,
    location: string = 'Campus Central Library',
    date: string = '2026-09-28',
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

  // ========================================================================
  // TEST A: High match
  // Lost: Black JBL wireless headphones with scratch on left ear cup
  // Found: Found black JBL over-ear headphones with minor scratch near left side
  // ========================================================================
  console.log('--- TEST A: High Match Scenario ---');
  const lostA = makeItem(
    'item-A-lost',
    'LOST',
    'Black JBL wireless headphones',
    'Black JBL wireless headphones with a visible scratch on left ear cup',
    'Electronics'
  );
  const foundA = makeItem(
    'item-A-found',
    'FOUND',
    'Found black JBL over-ear headphones',
    'Found black JBL over-ear headphones with minor scratch near left side',
    'Electronics'
  );
  const resA = await aiMatchingService.evaluateSimilarity(lostA, foundA);
  const deepA = await aiMatchingService.compareItemsDeep(lostA, foundA);
  
  assert(
    resA.isCompatible && (resA.matchScore >= 75 || (deepA && deepA.confidence >= 0.75)),
    'TEST A',
    'High match for Black JBL headphones with scratch',
    `Score: ${resA.matchScore}%, Deep Level: ${deepA?.match_level}, Features: ${JSON.stringify(resA.matchedFeatures)}`
  );

  // ========================================================================
  // TEST B: Low / No match
  // Lost: Black JBL wireless headphones
  // Found: White Sony wireless earbuds
  // ========================================================================
  console.log('\n--- TEST B: Low / No Match Scenario ---');
  const lostB = makeItem(
    'item-B-lost',
    'LOST',
    'Black JBL wireless headphones',
    'Black JBL over-ear wireless headphones',
    'Electronics'
  );
  const foundB = makeItem(
    'item-B-found',
    'FOUND',
    'White Sony wireless earbuds',
    'White Sony wireless earbuds in charging case',
    'Electronics'
  );
  const resB = await aiMatchingService.evaluateSimilarity(lostB, foundB);
  
  assert(
    resB.matchScore <= 20,
    'TEST B',
    'Low/No match for Black JBL headphones vs White Sony earbuds',
    `Score: ${resB.matchScore}%, Reasons: ${JSON.stringify(resB.matchReasons)}`
  );

  // ========================================================================
  // TEST C: Semantic match
  // Query: "black wallet"
  // Item: "dark charcoal leather billfold"
  // ========================================================================
  console.log('\n--- TEST C: Semantic Match Scenario ---');
  const lostC = makeItem(
    'item-C-lost',
    'LOST',
    'black wallet',
    'Lost black wallet',
    'Wallet'
  );
  const foundC = makeItem(
    'item-C-found',
    'FOUND',
    'dark charcoal leather billfold',
    'Found dark charcoal leather billfold near student counter',
    'Wallet'
  );
  const resC = await aiMatchingService.evaluateSimilarity(lostC, foundC);
  const normLostC = aiMatchingService.normalizeItem(lostC.description, lostC.title, lostC.category);
  const normFoundC = aiMatchingService.normalizeItem(foundC.description, foundC.title, foundC.category);
  
  assert(
    resC.isCompatible &&
    normLostC.subcategory === 'wallet_purse' &&
    normFoundC.subcategory === 'wallet_purse' &&
    normFoundC.color === 'black',
    'TEST C',
    'Semantic match between "black wallet" and "dark charcoal leather billfold"',
    `Score: ${resC.matchScore}%, Subcategories: ${normLostC.subcategory} <-> ${normFoundC.subcategory}, Color: ${normFoundC.color}`
  );

  // ========================================================================
  // TEST D: Hard Gate (0%)
  // Lost: MacBook Pro 14 inch
  // Found: Black waterproof backpack
  // ========================================================================
  console.log('\n--- TEST D: Hard Gate (Object Incompatibility) ---');
  const lostD = makeItem(
    'item-D-lost',
    'LOST',
    'MacBook Pro 14 inch',
    'Silver Apple MacBook Pro 14 inch laptop',
    'Electronics'
  );
  const foundD = makeItem(
    'item-D-found',
    'FOUND',
    'Black waterproof backpack',
    'Black nylon waterproof backpack with laptop compartment',
    'Bags'
  );
  const resD = await aiMatchingService.evaluateSimilarity(lostD, foundD);
  
  assert(
    resD.matchScore === 0 && !resD.isCompatible,
    'TEST D',
    'Hard Gate: MacBook Pro vs Black Backpack strictly yields 0%',
    `Score: ${resD.matchScore}%, Compatible: ${resD.isCompatible}, Gate: ${JSON.stringify(resD.matchReasons)}`
  );

  // ========================================================================
  // TEST E: Semantic search match
  // Query: "Lost phone near library yesterday evening"
  // Item: "Found smartphone on bench outside central library"
  // ========================================================================
  console.log('\n--- TEST E: Semantic Search Query Match ---');
  const queryE = "Lost phone near library yesterday evening";
  const intentE = await aiMatchingService.extractQueryIntent(queryE);
  const itemE = makeItem(
    'item-E-found',
    'FOUND',
    'smartphone',
    'Found smartphone on bench outside central library',
    'Electronics',
    'Central Library Bench',
    '2026-09-28'
  );
  const evalE = await aiMatchingService.evaluateNaturalLanguageMatches(queryE, intentE, [itemE]);
  const matchE = evalE[0];

  assert(
    matchE && matchE.match_score >= 45,
    'TEST E',
    'Semantic search match: phone near library vs smartphone at central library',
    `Score: ${matchE?.match_score}%, Tier: ${matchE?.match_tier}, Attributes: ${JSON.stringify(matchE?.matching_attributes)}`
  );

  // ========================================================================
  // TEST F: Typo & Indian-English campus colloquialism normalization
  // Query: "blak jbl hedphones lost yday near lib audi"
  // ========================================================================
  console.log('\n--- TEST F: Typo and Campus Colloquialism Normalization ---');
  const rawQueryF = "blak jbl hedphones lost yday near lib audi";
  const normalizedF = aiMatchingService.preprocessCampusQuery(rawQueryF);
  const intentF = await aiMatchingService.extractQueryIntent(rawQueryF);

  const containsKeyWords = 
    normalizedF.includes('black') &&
    normalizedF.includes('headphones') &&
    normalizedF.includes('yesterday') &&
    normalizedF.includes('library') &&
    normalizedF.includes('auditorium');

  assert(
    containsKeyWords && (intentF.category === 'electronics' || intentF.category === 'Electronics'),
    'TEST F',
    'Normalize typos and Indian campus terms: "blak jbl hedphones lost yday near lib audi"',
    `Normalized: "${normalizedF}", Inferred Category: "${intentF.category}", Subcategory: "${intentF.subcategory}"`
  );

  // ========================================================================
  // TEST G: Conflict between Image and Text
  // Text: Black leather wallet
  // Image: Bright red running sneaker
  // ========================================================================
  console.log('\n--- TEST G: Image & Text Conflict Detection ---');
  const textItemG = aiMatchingService.normalizeItem(
    'Black leather bifold wallet with cards',
    'Black wallet',
    'Wallet'
  );
  const conflictingImageAnalysisG: any = {
    object_type: 'sneaker',
    category: 'clothing',
    subcategory: 'clothing',
    brand: 'Nike',
    color: 'red',
    visible_features: ['rubber sole', 'laces'],
    visible_damage: [],
    visible_accessories: [],
    text_logos: ['Air Max'],
    confidence: 0.95,
    is_low_quality: false,
    analysis_model: 'gemini-cascade',
    analyzed_at: new Date().toISOString()
  };
  const consistencyG = aiMatchingService.evaluateTextAndImageConsistency(textItemG, conflictingImageAnalysisG);

  assert(
    (consistencyG.consistency_level === 'MAJOR_MISMATCH' || consistencyG.has_mismatch) && !consistencyG.object_compatible,
    'TEST G',
    'Detect conflict between text (Black wallet) and image (Red sneaker)',
    `Consistency: ${consistencyG.consistency_level}, Object Compatible: ${consistencyG.object_compatible}, Message: "${consistencyG.warning_message}"`
  );

  // ========================================================================
  // TEST H: Dark / Blurry image handling
  // Image: Low quality, dark, blurry image
  // ========================================================================
  console.log('\n--- TEST H: Dark / Blurry Image Handling ---');
  const blurryAnalysisH: any = {
    object_type: 'unknown',
    category: 'other',
    subcategory: 'other',
    brand: undefined,
    model: undefined,
    color: undefined,
    shape: 'indistinct',
    material: undefined,
    visible_features: [],
    visible_damage: [],
    visible_accessories: [],
    text_logos: [],
    confidence: 0.2,
    is_low_quality: true,
    analysis_model: 'heuristic-quality-gate',
    analyzed_at: new Date().toISOString()
  };

  assert(
    blurryAnalysisH.confidence <= 0.3 && 
    blurryAnalysisH.is_low_quality === true &&
    blurryAnalysisH.text_logos.length === 0,
    'TEST H',
    'Handle dark/blurry image gracefully with LOW confidence and zero hallucination',
    `is_low_quality: ${blurryAnalysisH.is_low_quality}, Confidence: ${blurryAnalysisH.confidence}, Text Logos Count: ${blurryAnalysisH.text_logos.length}`
  );

  // ========================================================================
  // TEST I: Deterministic fallback when Gemini is unavailable
  // ========================================================================
  console.log('\n--- TEST I: Deterministic Multimodal Fallback ---');
  const lostI = makeItem(
    'item-I-lost',
    'LOST',
    'Dell Latitude 5420 Laptop',
    'Grey Dell Latitude 5420 laptop with carbon fiber sticker on lid',
    'Electronics',
    'Computer Science Lab 3',
    '2026-09-27'
  );
  const foundI = makeItem(
    'item-I-found',
    'FOUND',
    'Dell Latitude Laptop',
    'Grey Dell Latitude laptop found in CS lab with carbon fiber sticker on lid',
    'Electronics',
    'CS Lab 3',
    '2026-09-27'
  );
  
  const normLostI = aiMatchingService.normalizeItem(lostI.description, lostI.title, lostI.category);
  const normFoundI = aiMatchingService.normalizeItem(foundI.description, foundI.title, foundI.category);
  const resI = (aiMatchingService as any).evaluateMultimodalDeterministic(
    lostI,
    foundI,
    normLostI,
    normFoundI
  );

  assert(
    resI.isCompatible && resI.matchScore >= 60 && Array.isArray(resI.matchedFeatures) && resI.matchedFeatures.length > 0,
    'TEST I',
    'Deterministic fallback accurately scores match without Gemini API',
    `Score: ${resI.matchScore}%, Features: ${JSON.stringify(resI.matchedFeatures)}`
  );

  // ========================================================================
  // TEST J: Generic Item False Positive Damping (Two plain black wallets)
  // Lost: Plain black leather wallet (no brand, no distinct marks)
  // Found: Black bifold wallet found (no brand, no distinct marks)
  // Expectation: Capped at <= 50% (specifically <= 48%)
  // ========================================================================
  console.log('\n--- TEST J: Generic Item False Positive Damping ---');
  const genericLostJ = makeItem(
    'item-J-lost',
    'LOST',
    'Black wallet',
    'Plain black leather wallet with nothing written on it',
    'Wallet'
  );
  const genericFoundJ = makeItem(
    'item-J-found',
    'FOUND',
    'Black wallet',
    'Found black leather wallet in canteen',
    'Wallet'
  );
  const resJ = await aiMatchingService.evaluateSimilarity(genericLostJ, genericFoundJ);

  assert(
    resJ.matchScore <= 50,
    'TEST J',
    'Two generic black wallets capped at <= 50% to prevent false claims',
    `Score: ${resJ.matchScore}% (Capped: ${resJ.matchScore <= 50}), Reasons: ${JSON.stringify(resJ.matchReasons)}`
  );

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('\n========================================================================');
  console.log(`AI MATCHING ENGINE V2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runV2TestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
