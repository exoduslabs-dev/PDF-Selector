// Test quote submission workflow
const API_BASE = 'http://localhost:3001';

async function testQuoteSubmission() {
    console.log('🧪 Testing quote submission workflow...\n');
    
    try {
        // Step 1: Get quotes
        console.log('📋 Step 1: Fetching quotes...');
        const quotesResponse = await fetch(`${API_BASE}/api/quotes`);
        const quotes = await quotesResponse.json();
        console.log(`   Found ${quotes.length} quotes`);
        
        // Find first unprocessed quote
        const unprocessedQuote = quotes.find(quote => 
            quote.sizeGroups.some(sg => !sg.processed)
        );
        
        if (!unprocessedQuote) {
            console.log('❌ No unprocessed quotes found for testing');
            return;
        }
        
        const firstSizeGroup = unprocessedQuote.sizeGroups.find(sg => !sg.processed);
        console.log(`   Selected quote: ${unprocessedQuote.quoteId} - ${firstSizeGroup.size}`);
        console.log(`   Line identifiers: ${firstSizeGroup.lineIdentifiers}`);
        console.log(`   Processed status: ${firstSizeGroup.processed}`);
        
        // Step 2: Submit the quote
        console.log('\n📤 Step 2: Submitting quote...');
        const submitResponse = await fetch(`${API_BASE}/api/submit-line`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: unprocessedQuote.quoteId,
                type: 'quote',
                size: firstSizeGroup.size,
                lineIdentifiers: firstSizeGroup.lineIdentifiers
            })
        });
        
        const submitResult = await submitResponse.json();
        
        if (submitResponse.ok) {
            console.log('   ✅ Quote submitted successfully:', submitResult.message);
        } else {
            console.log('   ❌ Quote submission failed:', submitResult.error);
            return;
        }
        
        // Step 3: Verify the quote is now processed
        console.log('\n🔍 Step 3: Verifying quote is now processed...');
        const updatedQuotesResponse = await fetch(`${API_BASE}/api/quotes`);
        const updatedQuotes = await updatedQuotesResponse.json();
        
        const updatedQuote = updatedQuotes.find(q => q.quoteId === unprocessedQuote.quoteId);
        const updatedSizeGroup = updatedQuote.sizeGroups.find(sg => sg.size === firstSizeGroup.size);
        
        console.log(`   Updated processed status: ${updatedSizeGroup.processed}`);
        
        if (updatedSizeGroup.processed) {
            console.log('   ✅ Quote successfully marked as processed!');
            console.log('\n🏆 WORKFLOW TEST PASSED! Quote processing is working correctly.');
        } else {
            console.log('   ❌ Quote was not marked as processed - there may be an issue.');
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testQuoteSubmission();
