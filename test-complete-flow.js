#!/usr/bin/env node

// Test the complete end-to-end flow
const API_BASE_URL = 'http://localhost:3001';

async function testCompleteFlow() {
  console.log('🧪 Testing complete end-to-end flow...\n');

  try {
    // Step 1: Reset test data
    console.log('📋 Step 1: Resetting test data...');
    const resetResponse = await fetch(`http://localhost:5432`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "UPDATE quotes SET processed = false WHERE quoteid = 'Q15029';"
      })
    }).catch(() => null);

    // Step 2: Get initial state from API
    console.log('📋 Step 2: Getting initial state from quotes API...');
    const quotesResponse = await fetch(`${API_BASE_URL}/api/quotes`);
    if (!quotesResponse.ok) {
      throw new Error(`API call failed: ${quotesResponse.status}`);
    }
    
    const quotes = await quotesResponse.json();
    const targetQuote = quotes.find(q => q.quoteId === 'Q15029');
    
    if (!targetQuote) {
      throw new Error('Target quote Q15029 not found');
    }
    
    console.log(`   Found quote: ${targetQuote.quoteId} with ${targetQuote.sizeGroups.length} size groups`);
    targetQuote.sizeGroups.forEach((sg, index) => {
      console.log(`   ${index + 1}. Size: ${sg.size}, Processed: ${sg.processed}`);
    });

    // Step 3: Submit first size group
    console.log('\n📤 Step 3: Submitting first size group...');
    const firstSize = targetQuote.sizeGroups[0];
    const submitResponse = await fetch(`${API_BASE_URL}/api/submit-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'Q15029',
        type: 'quote',
        size: firstSize.size,
        lineIdentifiers: firstSize.lineIdentifiers
      })
    });

    if (!submitResponse.ok) {
      throw new Error(`Submit failed: ${submitResponse.status}`);
    }

    const submitResult = await submitResponse.json();
    console.log(`   ✅ Quote submitted: ${submitResult.message}`);

    // Step 4: Wait a moment and check updated state
    console.log('\n🔍 Step 4: Checking updated state...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const updatedResponse = await fetch(`${API_BASE_URL}/api/quotes`);
    const updatedQuotes = await updatedResponse.json();
    const updatedQuote = updatedQuotes.find(q => q.quoteId === 'Q15029');

    console.log(`   Updated status:`);
    updatedQuote.sizeGroups.forEach((sg, index) => {
      const icon = sg.processed ? '🎯' : '🔹';
      console.log(`   ${icon} ${index + 1}. Size: ${sg.size}, Processed: ${sg.processed}`);
    });

    // Step 5: Verify selective processing
    const processedCount = updatedQuote.sizeGroups.filter(sg => sg.processed).length;
    const expectedProcessed = 1;

    if (processedCount === expectedProcessed) {
      console.log(`\n✅ SUCCESS! Selective processing working correctly:`);
      console.log(`   ✅ Only ${processedCount} size group processed (expected: ${expectedProcessed})`);
      console.log(`   ✅ Target size "${firstSize.size}" is processed`);
      console.log(`   ✅ Other size groups remain unprocessed`);
    } else {
      console.log(`\n❌ FAILURE! Incorrect processing behavior:`);
      console.log(`   ❌ ${processedCount} size groups processed (expected: ${expectedProcessed})`);
    }

  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
  }
}

testCompleteFlow();
