#!/usr/bin/env bun

interface LabexOrder {
  id: number;
  orders_id: number;
  order_status: string;
  orders_due_date: string;
  production_due_date: string;
  products_name: string;
  products_title: string;
  products_quantity: string;
  products_price: string;
  features_details: string;
  productsize: string;
  pdffiles: string;
  customers_name: string;
  customers_company: string;
  customers_email_address: string;
  customers_telephone: string;
  order_last_modified: string;
  archive_order: string;
  PO_number: string | null;
  total_amount: number;
  currency_code: string;
  payment_method_name: string;
}

interface LabexApiResponse {
  success?: boolean;
  data?: LabexOrder[];
  error?: string;
}

class LabexDataSync {
  private apiUrl = 'https://www.labex.com.au/external_service/zapier-services/api.php';
  private token = 'EUGKKseI70UKh5VPHgxz';
  private lastDataHash: string = '';
  private checkInterval: number = 5 * 60 * 1000; // 5 minutes
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🚀 Labex Data Sync Service Started');
    console.log(`📡 API URL: ${this.apiUrl}`);
    console.log(`⏰ Check Interval: ${this.checkInterval / 1000 / 60} minutes`);
  }

  /**
   * Fetch data from Labex API
   */
  async fetchLabexData(): Promise<LabexOrder[]> {
    try {
      const url = `${this.apiUrl}?method=getOrdersinfo&token=${this.token}`;
      console.log(`🔍 Fetching data from: ${url}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LabexOrder[] = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format - expected array');
      }

      console.log(`✅ Fetched ${data.length} orders from Labex API`);
      return data;
    } catch (error) {
      console.error('❌ Error fetching Labex data:', error);
      throw error;
    }
  }

  /**
   * Check for new orders only (simplified - just basic info)
   */
  checkForNewOrders(orders: LabexOrder[]) {
    return orders.map(order => ({
      id: order.id,
      labexId: `labex_${order.id}`,
      customer: order.customers_company || order.customers_name,
      productTitle: order.products_title,
      quantity: order.products_quantity,
      orderDate: order.order_last_modified,
      status: order.order_status,
      // Basic info only - detailed data will be updated later
    }));
  }

  // Helper functions removed - only checking for new orders
  // Detailed data extraction will be done later when print files are ready

  /**
   * Generate a hash of the data to detect changes
   */
  private generateDataHash(data: LabexOrder[]): string {
    const relevantData = data.map(order => ({
      id: order.id,
      status: order.order_status,
      modified: order.order_last_modified,
      dueDate: order.production_due_date || order.orders_due_date
    }));
    
    return Bun.hash(JSON.stringify(relevantData)).toString();
  }

  /**
   * Check if data has changed
   */
  private hasDataChanged(data: LabexOrder[]): boolean {
    const currentHash = this.generateDataHash(data);
    const changed = currentHash !== this.lastDataHash;
    
    if (changed) {
      console.log('🔄 Data has changed - updating hash');
      this.lastDataHash = currentHash;
    } else {
      console.log('✅ No changes detected');
    }
    
    return changed;
  }

  /**
   * Process and display the transformed data
   */
  async processData() {
    try {
      const orders = await this.fetchLabexData();
      
              if (this.hasDataChanged(orders)) {
          console.log('\n🆕 Checking for new Labex orders...');
          
          const newOrders = this.checkForNewOrders(orders);
          
          // Display new orders summary
          console.log('\n📋 New Labex Orders Detected:');
          console.log('=' .repeat(50));
          
          newOrders.forEach(order => {
            console.log(`   • ${order.labexId}: ${order.customer} - ${order.productTitle}`);
            console.log(`     Qty: ${order.quantity} | Status: ${order.status} | Date: ${order.orderDate}`);
            console.log('');
          });

        // Show recent changes
        const recentOrders = orders
          .filter(order => {
            const modified = new Date(order.order_last_modified);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return modified > oneDayAgo;
          })
          .sort((a, b) => new Date(b.order_last_modified).getTime() - new Date(a.order_last_modified).getTime());

        if (recentOrders.length > 0) {
          console.log('\n🆕 Recent Changes (Last 24h):');
          console.log('=' .repeat(50));
          recentOrders.slice(0, 5).forEach(order => {
            console.log(`   • ${order.products_title} (ID: ${order.id}) - ${order.order_status} - Modified: ${order.order_last_modified}`);
          });
        }

        // TODO: Here you could:
        // 1. Send notifications for new orders
        // 2. Log new orders to a file
        // 3. Trigger alerts for production team
        // 4. Detailed data will be updated later when print files are ready
        
        console.log('\n💡 Purpose:');
        console.log('   - Monitor for new Labex orders only');
        console.log('   - Basic order info (customer, product, quantity)');
        console.log('   - Detailed data updated later with print files');
        console.log('   - Use for early notification of new work');
        
      } else {
        console.log('✅ No changes detected in Labex data');
      }
      
    } catch (error) {
      console.error('❌ Error processing Labex data:', error);
    }
  }

  /**
   * Start monitoring for changes
   */
  startMonitoring() {
    console.log('🔄 Starting continuous monitoring...');
    
    // Initial fetch
    this.processData();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.processData();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️  Monitoring stopped');
    }
  }

  /**
   * Manual refresh
   */
  async manualRefresh() {
    console.log('🔄 Manual refresh triggered');
    await this.processData();
  }
}

// CLI interface
async function main() {
  const sync = new LabexDataSync();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    // Single fetch
    await sync.processData();
  } else if (args.includes('--monitor')) {
    // Continuous monitoring
    sync.startMonitoring();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down gracefully...');
      sync.stopMonitoring();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down gracefully...');
      sync.stopMonitoring();
      process.exit(0);
    });
  } else {
    // Default: single fetch with usage info
    console.log('📖 Labex Data Sync Script');
    console.log('=' .repeat(40));
    console.log('Usage:');
    console.log('  bun run labex_sync.ts --once     # Fetch data once');
    console.log('  bun run labex_sync.ts --monitor  # Monitor continuously');
    console.log('  bun run labex_sync.ts            # Single fetch (default)');
    console.log('');
    
    await sync.processData();
  }
}

// Run the script
if (import.meta.main) {
  main().catch(console.error);
}

export { LabexDataSync };
