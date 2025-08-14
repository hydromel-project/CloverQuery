#!/usr/bin/env tsx

/**
 * Clover Sync CLI Tool
 * 
 * Syncs customer data from Clover API to local SQLite database
 * Usage: npm run sync
 */

import { CloverSyncService } from '../app/lib/clover-sync';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve('.env') });

async function main() {
  console.log('🔄 Starting Clover API sync...\n');
  
  const syncService = new CloverSyncService();
  
  try {
    const startTime = Date.now();
    const result = await syncService.syncAllCustomers();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log('✅ Sync completed successfully!');
      console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
      console.log(`📊 Total customers synced: ${result.stats.totalCustomers}`);
      
      if (result.stats.customersByMerchant) {
        console.log('\n📈 Breakdown by merchant:');
        for (const [currency, stats] of Object.entries(result.stats.customersByMerchant as any)) {
          console.log(`   ${currency}: ${stats.synced}/${stats.fetched} customers (${stats.errors} errors)`);
        }
      }
    } else {
      console.log('❌ Sync completed with errors');
      console.log(`📊 Total customers synced: ${result.stats.totalCustomers}`);
      console.log(`🚨 Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Error details:');
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.error}`);
          if (error.merchantId) console.log(`      Merchant: ${error.merchantId}`);
          if (error.customerId) console.log(`      Customer: ${error.customerId}`);
        });
      }
    }
    
    // Show current stats
    console.log('\n📋 Database stats:');
    const stats = await syncService.getStats();
    console.log(`   Total customers: ${stats.totalCustomers}`);
    console.log(`   With payment cards: ${stats.customersWithCards}`);
    console.log(`   Business customers: ${stats.customersWithBusinessName}`);
    
    if (stats.customersByMerchant && stats.customersByMerchant.length > 0) {
      console.log('   By merchant:');
      stats.customersByMerchant.forEach((merchant: any) => {
        console.log(`     ${merchant.merchantCurrency}: ${merchant.count} customers`);
      });
    }
    
    console.log(`\n✨ Sync completed at ${new Date().toLocaleString()}`);
    
  } catch (error) {
    console.error('💥 Fatal error during sync:', error);
    process.exit(1);
  }
}

// Run the sync if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}