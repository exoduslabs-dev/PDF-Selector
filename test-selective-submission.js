// Test selective quote submission
const API_BASE = 'http://localhost:3001';

async function testSelectiveSubmission() {
    console.log('🧪 Testing selective quote submission...\n');
    
    try {
        // Step 1: Find a quote with multiple sizes
        console.log('📋 Step 1: Finding multi-size quote...');
        const quotesResponse = await fetch(`${API_BASE}/api/quotes`);
        const quotes = await quotesResponse.json();
        
        const multiSizeQuote = quotes.find(q => 
            q.sizeGroups.length > 1 && 
            q.sizeGroups.some(sg => !sg.processed) &&
            q.sizeGroups.length >= 2
        );
        
        if (!multiSizeQuote) {
            console.log('❌ No multi-size unprocessed quotes found');
            return;
        }
        
        console.log(`   Found quote: ${multiSizeQuote.quoteId} with ${multiSizeQuote.sizeGroups.length} size groups`);
        multiSizeQuote.sizeGroups.forEach((sg, i) => {
            console.log(`   ${i+1}. Size: ${sg.size}, Processed: ${sg.processed}, Lines: ${sg.lineIdentifiers}`);
        });
        
        // Pick the first unprocessed size group
        const targetSizeGroup = multiSizeQuote.sizeGroups.find(sg => !sg.processed);
        const otherSizeGroups = multiSizeQuote.sizeGroups.filter(sg => sg !== targetSizeGroup);
        
        console.log(`\n   Target size group: ${targetSizeGroup.size}`);
        console.log(`   Other size groups: ${otherSizeGroups.map(sg => sg.size).join(', ')}`);
        
        // Step 2: Submit only the target size group
        console.log('\n📤 Step 2: Submitting ONE size group...');
        const submitResponse = await fetch(`${API_BASE}/api/submit-line`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: multiSizeQuote.quoteId,
                type: 'quote',
                size: targetSizeGroup.size,
                lineIdentifiers: targetSizeGroup.lineIdentifiers
            })
        });
        
        const submitResult = await submitResponse.json();
        
        if (submitResponse.ok) {
            console.log('   ✅ Quote submitted successfully:', submitResult.message);
        } else {
            console.log('   ❌ Quote submission failed:', submitResult.error);
            return;
        }
        
        // Step 3: Verify only the target size was processed
        console.log('\n🔍 Step 3: Verifying selective processing...');
        const updatedQuotesResponse = await fetch(`${API_BASE}/api/quotes`);
        const updatedQuotes = await updatedQuotesResponse.json();
        
        const updatedQuote = updatedQuotes.find(q => q.quoteId === multiSizeQuote.quoteId);
        
        console.log('\n   Updated status:');
        updatedQuote.sizeGroups.forEach((sg, i) => {
            const wasTarget = sg.size === targetSizeGroup.size;
            const icon = wasTarget ? '🎯' : '🔹';
            console.log(`   ${icon} ${i+1}. Size: ${sg.size}, Processed: ${sg.processed}`);
        });
        
        // Check results
        const targetUpdated = updatedQuote.sizeGroups.find(sg => sg.size === targetSizeGroup.size);
        const otherUpdated = updatedQuote.sizeGroups.filter(sg => sg.size !== targetSizeGroup.size);
        
        const targetProcessedCorrectly = targetUpdated.processed === true;
        const othersUnchanged = otherUpdated.every(sg => sg.processed === false);
        
        if (targetProcessedCorrectly && othersUnchanged) {
            console.log('\n🏆 SUCCESS! Only the target size group was processed!');
            console.log('   ✅ Target size group marked as processed');
            console.log('   ✅ Other size groups remain unprocessed');
        } else {
            console.log('\n❌ FAILURE! Incorrect processing behavior:');
            if (!targetProcessedCorrectly) {
                console.log('   ❌ Target size group was NOT processed');
            }
            if (!othersUnchanged) {
                console.log('   ❌ Other size groups were incorrectly processed');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testSelectiveSubmission();
