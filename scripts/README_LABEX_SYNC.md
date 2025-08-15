# Labex New Order Monitor Script

This script monitors the Labex API for **new orders only**. It provides early notification of new work without syncing detailed information, which will be updated later when print files are ready.

## Features

- 🔄 **Real-time monitoring** - Checks for new orders every 5 minutes
- 🆕 **New order detection** - Identifies when new orders arrive
- 📋 **Basic information** - Shows customer, product, quantity, and status
- 📈 **Change detection** - Only alerts when new orders are detected
- ⏳ **Lightweight** - Minimal data processing, detailed sync later

## API Endpoint

The script fetches data from:
```
https://www.labex.com.au/external_service/zapier-services/api.php?method=getOrdersinfo&token=EUGKKseI70UKh5VPHgxz
```

## Usage

### Quick Start

```bash
# Single data fetch
npm run labex:once

# Continuous monitoring (every 5 minutes)
npm run labex:monitor

# Single fetch with default script
npm run labex:sync
```

### Direct Script Usage

```bash
# Single fetch
bun scripts/labex_sync.ts --once

# Continuous monitoring
bun scripts/labex_sync.ts --monitor

# Single fetch (default)
bun scripts/labex_sync.ts
```

## Data Output

### New Order Information

The script provides basic information for new orders:

```typescript
{
  id: order.id,                      // Labex order ID
  labexId: `labex_${order.id}`,     // Formatted ID for your system
  customer: order.customers_company || order.customers_name,
  productTitle: order.products_title,
  quantity: order.products_quantity,
  orderDate: order.order_last_modified,
  status: order.order_status
}
```

**Note:** This is minimal data only. Detailed information (materials, finishing, due dates, etc.) will be updated later when print files are ready.

## Purpose

This script is designed to provide **early notification** of new Labex orders. It does not:

- Extract detailed finishing information
- Parse material specifications  
- Map to Kanban columns
- Sync with your database

**Instead, it simply alerts you when new orders arrive so you can prepare for the detailed work later.**

## Monitoring

### Change Detection
- Generates hash of relevant data (ID, status, dates)
- Only processes data when changes are detected
- Tracks last modification times

### Recent Changes
Shows orders modified in the last 24 hours:
- Product title
- Order ID
- Status
- Last modified date

## Integration Points

### Simple Notifications
```typescript
// TODO: Add basic notification system
const sendNewOrderAlert = async (newOrders) => {
  // Email notifications for production team
  // Slack/Discord webhooks
  // SMS alerts for urgent orders
};
```

### Logging
```typescript
// TODO: Log new orders for tracking
const logNewOrders = async (newOrders) => {
  // Save to log file
  // Track order arrival times
  // Monitor order volume
};
```

### Future Integration
```typescript
// TODO: When ready for detailed sync
const detailedSync = async (orderId) => {
  // Extract print files
  // Parse detailed specifications
  // Update Kanban board
  // Sync with database
};
```

## Configuration

### Check Interval
Default: 5 minutes
```typescript
private checkInterval: number = 5 * 60 * 1000; // 5 minutes
```

### API Token
Currently hardcoded in the script:
```typescript
private token = 'EUGKKseI70UKh5VPHgxz';
```

## Error Handling

- HTTP error handling
- Invalid response format validation
- Graceful shutdown on SIGINT/SIGTERM
- Detailed error logging

## Next Steps

1. **Database Integration**
   - Create Labex jobs table
   - Sync with existing job_lines structure
   - Handle file attachments

2. **Real-time Updates**
   - WebSocket connection to frontend
   - Live Kanban board updates
   - Push notifications

3. **Advanced Features**
   - PDF file processing
   - Thumbnail generation
   - Workflow automation
   - Reporting and analytics

4. **Security**
   - Environment variables for API tokens
   - Rate limiting
   - Authentication

## Example Output

```
🚀 Labex New Order Monitor Started
📡 API URL: https://www.labex.com.au/external_service/zapier-services/api.php
⏰ Check Interval: 5 minutes
🔍 Fetching data from: https://www.labex.com.au/external_service/zapier-services/api.php?method=getOrdersinfo&token=EUGKKseI70UKh5VPHgxz
✅ Fetched 15 orders from Labex API
🔄 Data has changed - updating hash

🆕 Checking for new Labex orders...

📋 New Labex Orders Detected:
==================================================
   • labex_3553: Aretii Naturals - Square Synthetic Labels
     Qty: 10000 | Status: Order Processing | Date: 2025-08-14 21:05:28

   • labex_3552: thermaleyes@thermaleyes.com - Rectangle Paper Labels
     Qty: 1000 | Status: Order Processing | Date: 2025-08-14 19:49:38

💡 Purpose:
   - Monitor for new Labex orders only
   - Basic order info (customer, product, quantity)
   - Detailed data updated later with print files
   - Use for early notification of new work
```

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check internet connection
   - Verify API endpoint is accessible
   - Check if token is still valid

2. **No Data Returned**
   - API might be down
   - Token might have expired
   - Check API response format

3. **Script Won't Stop**
   - Use Ctrl+C to stop monitoring
   - Check for zombie processes

### Debug Mode
Add console.log statements or use browser dev tools to inspect the data flow.

## Support

For issues or questions about the Labex sync script, check:
1. Console output for error messages
2. API endpoint accessibility
3. Data format changes from Labex
4. Network connectivity
