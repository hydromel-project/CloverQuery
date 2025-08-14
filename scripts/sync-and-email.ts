#!/usr/bin/env tsx

/**
 * Clover Sync and Email Reports Script
 * 
 * Performs a complete workflow:
 * 1. Syncs latest customer data from Clover API
 * 2. Generates and emails expired cards report
 * 3. Generates and emails expiring cards report
 * 
 * Usage: npm run sync-and-email
 * 
 * Requirements:
 * - EMAIL_ENABLED=true in .env
 * - Valid Microsoft 365 credentials configured
 * - Server running (for PDF generation)
 */

import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve('.env') });

interface ReportResult {
  filter: string;
  success: boolean;
  customerCount?: number;
  error?: string;
}

async function runCommand(command: string, description: string): Promise<{ success: boolean; output?: string; error?: string }> {
  console.log(`🔄 ${description}...`);
  
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000' }
    });
    
    console.log(`✅ ${description} completed successfully`);
    return { success: true, output };
    
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function generateAndEmailReport(filter: 'expired' | 'expiring'): Promise<ReportResult> {
  console.log(`\n📊 Generating ${filter} cards report...`);
  
  try {
    const command = `npm run pdf:${filter}`;
    const result = await runCommand(command, `Generate ${filter} report with email`);
    
    if (result.success && result.output) {
      // Extract customer count from output
      const customerCountMatch = result.output.match(/👥 Customers: (\d+)/);
      const customerCount = customerCountMatch ? parseInt(customerCountMatch[1]) : 0;
      
      // Check if email was sent successfully
      const emailSuccess = result.output.includes('Email sent successfully');
      
      if (emailSuccess) {
        console.log(`✅ ${filter} report: ${customerCount} customers - Email sent successfully`);
      } else {
        console.log(`⚠️  ${filter} report: ${customerCount} customers - Email may have failed`);
      }
      
      return { filter, success: true, customerCount };
    } else {
      return { filter, success: false, error: result.error };
    }
    
  } catch (error) {
    return { 
      filter, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function main() {
  console.log('🚀 Clover Sync and Email Reports Workflow');
  console.log('==========================================\n');
  
  // Check if email is enabled
  const emailEnabled = process.env.EMAIL_ENABLED === 'true';
  if (!emailEnabled) {
    console.error('❌ EMAIL_ENABLED must be set to true in .env file');
    process.exit(1);
  }
  
  console.log(`📧 Email recipient: ${process.env.EMAIL_RECIPIENT}`);
  console.log(`🔗 Server URL: ${process.env.SERVER_URL || 'http://localhost:3000'}\n`);
  
  const startTime = Date.now();
  const results: { step: string; success: boolean; details?: any }[] = [];
  
  // Step 1: Sync data from Clover API
  console.log('📅 STEP 1: Syncing latest customer data');
  console.log('----------------------------------------');
  
  const syncResult = await runCommand('npm run sync', 'Sync customer data from Clover API');
  results.push({ step: 'Data Sync', success: syncResult.success, details: syncResult.error });
  
  if (!syncResult.success) {
    console.error('💥 Data sync failed - aborting email reports');
    process.exit(1);
  }
  
  // Step 2: Generate and email expired cards report
  console.log('\n📧 STEP 2: Expired Cards Report');
  console.log('--------------------------------');
  
  const expiredResult = await generateAndEmailReport('expired');
  results.push({ 
    step: 'Expired Cards Report', 
    success: expiredResult.success, 
    details: expiredResult.customerCount 
  });
  
  // Step 3: Generate and email expiring cards report
  console.log('\n📧 STEP 3: Expiring Cards Report');
  console.log('--------------------------------');
  
  const expiringResult = await generateAndEmailReport('expiring');
  results.push({ 
    step: 'Expiring Cards Report', 
    success: expiringResult.success, 
    details: expiringResult.customerCount 
  });
  
  // Summary
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('\n🎯 WORKFLOW SUMMARY');
  console.log('==================');
  console.log(`⏱️  Total time: ${duration} seconds`);
  console.log(`📧 Email recipient: ${process.env.EMAIL_RECIPIENT}\n`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const details = result.details !== undefined ? ` (${result.details}${typeof result.details === 'number' ? ' customers' : ''})` : '';
    console.log(`${status} ${result.step}${details}`);
  });
  
  // Check overall success
  const allSuccessful = results.every(r => r.success);
  
  if (allSuccessful) {
    console.log('\n🎉 All steps completed successfully!');
    console.log('📫 Check your inbox for the reports.');
  } else {
    console.log('\n⚠️  Some steps failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Run the workflow if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}