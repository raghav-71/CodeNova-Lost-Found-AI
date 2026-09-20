import { aiMatchingService, AIImageAnalysis } from './services/aiMatcher.js';
import { ItemRecord } from './db/supabaseDb.js';

async function runMultimodalVerificationTestSuite() {
  console.log('================================================================');
  console.log('🧪 FINDIT AI — MULTIMODAL AI VERIFICATION COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Text phone + phone image (CONSISTENT)
  // -------------------------------------------------------------------------
  const textPhone = aiMatchingService.normalizeItem('I lost my black Samsung Galaxy phone near the library.', 'Samsung Galaxy Phone', 'Electronics');
  const imgPhone: AIImageAnalysis = {
    object_type: 'smartphone',
    category: 'electronics',
    subcategory: 'mobile_phone',
    brand: 'Samsung',
    model: 'Galaxy',
    color: 'black',
    visible_features: ['three rear cameras'],
    visible_damage: ['cracked screen'],
    visible_accessories: [],
    text_logos: ['Samsung'],
    confidence: 0.94,
    is_low_quality: false,
    analysis_model: 'gemini-1.5-flash-vision',
    analyzed_at: new Date().toISOString()
  };

  const eval1 = aiMatchingService.evaluateTextAndImageConsistency(textPhone, imgPhone);
  assert(
    eval1.consistency_level === 'CONSISTENT' && eval1.object_compatible === true && !eval1.has_mismatch,
    'Test 1: Text phone + phone image -> CONSISTENT',
    `Got: ${eval1.consistency_level}, compatible: ${eval1.object_compatible}`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Text phone + laptop image (MAJOR_MISMATCH)
  // -------------------------------------------------------------------------
  const imgLaptop: AIImageAnalysis = {
    object_type: 'laptop',
    category: 'electronics',
    subcategory: 'laptop',
    brand: 'Dell',
    model: 'XPS',
    color: 'silver',
    visible_features: ['keyboard', 'trackpad'],
    visible_damage: [],
    visible_accessories: [],
    text_logos: ['Dell'],
    confidence: 0.95,
    is_low_quality: false,
    analysis_model: 'gemini-1.5-flash-vision',
    analyzed_at: new Date().toISOString()
  };

  const eval2 = aiMatchingService.evaluateTextAndImageConsistency(textPhone, imgLaptop);
  assert(
    eval2.consistency_level === 'MAJOR_MISMATCH' && eval2.object_compatible === false && eval2.has_mismatch === true,
    'Test 2: Text phone + laptop image -> MAJOR_MISMATCH (object_compatible = false)',
    `Got: ${eval2.consistency_level}, compatible: ${eval2.object_compatible}`
  );

  // -------------------------------------------------------------------------
  // TEST 3: Text laptop + laptop image (CONSISTENT)
  // -------------------------------------------------------------------------
  const textLaptop = aiMatchingService.normalizeItem('Silver Dell XPS 15 laptop in sleeve', 'Dell XPS Laptop', 'Electronics');
  const eval3 = aiMatchingService.evaluateTextAndImageConsistency(textLaptop, imgLaptop);
  assert(
    eval3.consistency_level === 'CONSISTENT' && eval3.object_compatible === true,
    'Test 3: Text laptop + laptop image -> CONSISTENT',
    `Got: ${eval3.consistency_level}`
  );

  // -------------------------------------------------------------------------
  // TEST 4: Text wallet + phone image (MAJOR_MISMATCH)
  // -------------------------------------------------------------------------
  const textWallet = aiMatchingService.normalizeItem('Brown leather bi-fold wallet with ID cards', 'Brown Wallet', 'Wallet');
  const eval4 = aiMatchingService.evaluateTextAndImageConsistency(textWallet, imgPhone);
  assert(
    eval4.consistency_level === 'MAJOR_MISMATCH' && eval4.object_compatible === false,
    'Test 4: Text wallet + phone image -> MAJOR_MISMATCH (object_compatible = false)',
    `Got: ${eval4.consistency_level}, compatible: ${eval4.object_compatible}`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Text blue phone + black phone image (MINOR_MISMATCH on color)
  // -------------------------------------------------------------------------
  const textBluePhone = aiMatchingService.normalizeItem('Lost my blue iPhone 14 Pro', 'Blue iPhone', 'Electronics');
  const imgBlackPhone: AIImageAnalysis = {
    object_type: 'smartphone',
    category: 'electronics',
    subcategory: 'mobile_phone',
    brand: 'Apple',
    model: 'iPhone 14',
    color: 'black',
    visible_features: [],
    visible_damage: [],
    visible_accessories: [],
    text_logos: ['Apple'],
    confidence: 0.92,
    is_low_quality: false,
    analysis_model: 'gemini-1.5-flash-vision',
    analyzed_at: new Date().toISOString()
  };

  const eval5 = aiMatchingService.evaluateTextAndImageConsistency(textBluePhone, imgBlackPhone);
  assert(
    eval5.consistency_level === 'MINOR_MISMATCH' && eval5.object_compatible === true && eval5.mismatch_type === 'COLOR_MISMATCH',
    'Test 5: Text blue phone + black phone image -> MINOR_MISMATCH (Color difference)',
    `Got: ${eval5.consistency_level}, mismatch_type: ${eval5.mismatch_type}`
  );

  // -------------------------------------------------------------------------
  // TEST 6: Text Samsung phone + generic phone image (CONSISTENT / UNKNOWN BRAND)
  // -------------------------------------------------------------------------
  const textSamsung = aiMatchingService.normalizeItem('Samsung Galaxy Phone', 'Samsung Phone', 'Electronics');
  const imgGenericPhone: AIImageAnalysis = {
    object_type: 'smartphone',
    category: 'electronics',
    subcategory: 'mobile_phone',
    brand: undefined, // brand cannot be identified
    model: undefined,
    color: undefined,
    visible_features: ['touchscreen'],
    visible_damage: [],
    visible_accessories: [],
    text_logos: [],
    confidence: 0.88,
    is_low_quality: false,
    analysis_model: 'gemini-1.5-flash-vision',
    analyzed_at: new Date().toISOString()
  };

  const eval6 = aiMatchingService.evaluateTextAndImageConsistency(textSamsung, imgGenericPhone);
  assert(
    eval6.consistency_level === 'CONSISTENT' && !eval6.has_mismatch,
    'Test 6: Text Samsung phone + generic phone image (unknown brand) -> CONSISTENT (no false accusation)',
    `Got: ${eval6.consistency_level}, mismatch: ${eval6.has_mismatch}`
  );

  // -------------------------------------------------------------------------
  // TEST 7: Text iPhone + Samsung phone image (MINOR_MISMATCH on brand)
  // -------------------------------------------------------------------------
  const eval7 = aiMatchingService.evaluateTextAndImageConsistency(textBluePhone, imgPhone);
  assert(
    eval7.consistency_level === 'MINOR_MISMATCH' && eval7.mismatch_type === 'BRAND_MISMATCH',
    'Test 7: Text iPhone + Samsung phone image -> MINOR_MISMATCH (Brand difference)',
    `Got: ${eval7.consistency_level}, mismatch_type: ${eval7.mismatch_type}`
  );

  // -------------------------------------------------------------------------
  // TEST 8: Blurry image (LOW CONFIDENCE -> Do NOT accuse user)
  // -------------------------------------------------------------------------
  const imgBlurry = await aiMatchingService.analyzeImage({
    hintText: 'blurry low quality out of focus photo'
  });
  const eval8 = aiMatchingService.evaluateTextAndImageConsistency(textPhone, imgBlurry);
  assert(
    imgBlurry.is_low_quality === true && imgBlurry.confidence < 0.50 && eval8.consistency_level === 'CONSISTENT',
    'Test 8: Blurry image -> Low confidence handled gracefully without accusing user',
    `Confidence: ${imgBlurry.confidence}, consistency: ${eval8.consistency_level}`
  );

  // -------------------------------------------------------------------------
  // TEST 9: Dark image (LOW CONFIDENCE -> Do NOT accuse user)
  // -------------------------------------------------------------------------
  const imgDark = await aiMatchingService.analyzeImage({
    hintText: 'extremely dark underexposed obscured picture'
  });
  const eval9 = aiMatchingService.evaluateTextAndImageConsistency(textLaptop, imgDark);
  assert(
    imgDark.is_low_quality === true && eval9.consistency_level === 'CONSISTENT',
    'Test 9: Dark image -> Low confidence handled gracefully without accusing user',
    `Confidence: ${imgDark.confidence}, consistency: ${eval9.consistency_level}`
  );

  // -------------------------------------------------------------------------
  // TEST 10: Multimodal Item-to-Item Similarity Engine Tests
  // -------------------------------------------------------------------------
  console.log('\n--- CROSS-ITEM MULTIMODAL MATCH ENGINE TESTS ---');

  // Case A: LOST Phone + FOUND Phone (Compatible + Image Verified -> Strong Match)
  const lostPhoneItem: ItemRecord = {
    id: 'lost-1',
    user_id: 'user-1',
    type: 'LOST',
    title: 'Black Samsung Galaxy S23',
    description: 'Black Samsung Galaxy phone with cracked screen',
    category: 'Electronics',
    location: 'Main University Library',
    date: '2026-09-18',
    status: 'ACTIVE',
    ai_image_analysis: imgPhone
  };

  const foundPhoneItem: ItemRecord = {
    id: 'found-1',
    user_id: 'user-2',
    type: 'FOUND',
    title: 'Samsung Phone Found',
    description: 'Black Samsung phone with cracked display found near 2nd floor library',
    category: 'Electronics',
    location: 'Main University Library',
    date: '2026-09-18',
    status: 'ACTIVE',
    ai_image_analysis: imgPhone
  };

  const matchResA = await aiMatchingService.evaluateSimilarity(lostPhoneItem, foundPhoneItem);
  assert(
    matchResA.isCompatible === true && matchResA.matchScore >= 70 && matchResA.multimodalVerified === true,
    `Test 10A: LOST Phone + FOUND Phone -> STRONG MATCH (${matchResA.matchScore}%)`,
    `Score: ${matchResA.matchScore}, Compatible: ${matchResA.isCompatible}`
  );

  // Case B: LOST Phone + FOUND Laptop (Incompatible Item Types -> Score MUST BE 0)
  const foundLaptopItem: ItemRecord = {
    id: 'found-2',
    user_id: 'user-3',
    type: 'FOUND',
    title: 'Found Dell XPS Laptop',
    description: 'Silver Dell XPS laptop found in study hall',
    category: 'Electronics',
    location: 'Main University Library',
    date: '2026-09-18',
    status: 'ACTIVE',
    ai_image_analysis: imgLaptop
  };

  const matchResB = await aiMatchingService.evaluateSimilarity(lostPhoneItem, foundLaptopItem);
  assert(
    matchResB.isCompatible === false && matchResB.matchScore === 0,
    `Test 10B: LOST Phone + FOUND Laptop -> HARD GATE TRIGGERED (0% Score)`,
    `Score: ${matchResB.matchScore}, Compatible: ${matchResB.isCompatible}`
  );

  // Case C: LOST Wallet + FOUND Wallet (Compatible -> Strong Match)
  const lostWalletItem: ItemRecord = {
    id: 'lost-3',
    user_id: 'user-1',
    type: 'LOST',
    title: 'Brown Leather Wallet',
    description: 'Brown leather bifold wallet with student ID inside',
    category: 'Wallet',
    location: 'Student Center & Cafeteria',
    date: '2026-09-19',
    status: 'ACTIVE'
  };

  const foundWalletItem: ItemRecord = {
    id: 'found-3',
    user_id: 'user-4',
    type: 'FOUND',
    title: 'Found Leather Wallet',
    description: 'Brown wallet found near cafeteria tables',
    category: 'Wallet',
    location: 'Student Center & Cafeteria',
    date: '2026-09-19',
    status: 'ACTIVE'
  };

  const matchResC = await aiMatchingService.evaluateSimilarity(lostWalletItem, foundWalletItem);
  assert(
    matchResC.isCompatible === true && matchResC.matchScore >= 60,
    `Test 10C: LOST Wallet + FOUND Wallet -> STRONG MATCH (${matchResC.matchScore}%)`,
    `Score: ${matchResC.matchScore}, Compatible: ${matchResC.isCompatible}`
  );

  // Case D: LOST Laptop + FOUND Phone (Incompatible -> 0% Score)
  const lostLaptopItem: ItemRecord = {
    id: 'lost-4',
    user_id: 'user-1',
    type: 'LOST',
    title: 'Dell XPS 15',
    description: 'Silver Dell laptop with stickers',
    category: 'Electronics',
    location: 'Engineering Building',
    date: '2026-09-19',
    status: 'ACTIVE',
    ai_image_analysis: imgLaptop
  };

  const matchResD = await aiMatchingService.evaluateSimilarity(lostLaptopItem, foundPhoneItem);
  assert(
    matchResD.isCompatible === false && matchResD.matchScore === 0,
    `Test 10D: LOST Laptop + FOUND Phone -> HARD GATE TRIGGERED (0% Score)`,
    `Score: ${matchResD.matchScore}, Compatible: ${matchResD.isCompatible}`
  );

  // Case E: Report with Major Discrepancy (claims Phone, but uploaded Laptop photo)
  const corruptedLostItem: ItemRecord = {
    id: 'lost-corrupted',
    user_id: 'user-5',
    type: 'LOST',
    title: 'Black Samsung Galaxy Phone',
    description: 'Black Samsung smartphone',
    category: 'Electronics',
    location: 'Main University Library',
    date: '2026-09-18',
    status: 'ACTIVE',
    ai_image_analysis: imgLaptop // Contradiction: text is phone, image is laptop!
  };

  const matchResE = await aiMatchingService.evaluateSimilarity(corruptedLostItem, foundPhoneItem);
  assert(
    matchResE.isCompatible === false && matchResE.matchScore === 0,
    'Test 10E: Report with uncorrected Major Contradiction (Phone text + Laptop photo) is gated from normal matching (0% Score)',
    `Score: ${matchResE.matchScore}, Reason: ${matchResE.matchReasons[0]}`
  );

  console.log('\n================================================================');
  console.log(`📊 RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMultimodalVerificationTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
