#!/usr/bin/env tsx

/**
 * Test USD Token Access
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const USD_TOKEN = 'dad780b5-9718-3839-d539-b2badac2ced8';
const BASE_URL = 'https://api.clover.com';
const USD_MERCHANT_ID = 'KWTTVV51DE3X1';

async function testUSDToken() {
  console.log('🧪 Testing USD Token Access');
  console.log(`📋 USD Token: ${USD_TOKEN}`);
  console.log(`🏢 USD Merchant ID: ${USD_MERCHANT_ID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('\n🔍 Testing USD merchant access...');
    const response = await fetch(`${BASE_URL}/v3/merchants/${USD_MERCHANT_ID}/customers?limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${USD_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ USD merchant access WORKS!');
      console.log(`📊 Customer count: ${data.elements?.length || 0}`);
      
      if (data.elements?.length > 0) {
        console.log('🎯 Sample customer data:');
        const sample = data.elements[0];
        console.log(`   ID: ${sample.id}`);
        console.log(`   Name: ${sample.firstName} ${sample.lastName}`);
        console.log(`   Since: ${sample.customerSince ? new Date(sample.customerSince).toLocaleDateString() : 'N/A'}`);
      }
      
      // Test with expanded fields
      console.log('\n🔍 Testing with expanded fields...');
      const expandedResponse = await fetch(`${BASE_URL}/v3/merchants/${USD_MERCHANT_ID}/customers?expand=cards,metadata,emailAddresses,phoneNumbers&limit=2`, {
        headers: {
          'Authorization': `Bearer ${USD_TOKEN}`,
          'Accept': 'application/json',
        },
      });
      
      if (expandedResponse.ok) {
        const expandedData = await expandedResponse.json();
        console.log('✅ Expanded data access works!');
        console.log(`📊 Found ${expandedData.elements?.length || 0} customers with expanded data`);
      } else {
        console.log(`❌ Expanded data failed: ${expandedResponse.status}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log(`❌ USD merchant access FAILED: ${errorText}`);
    }
    
  } catch (error) {
    console.log(`💥 Exception: ${error}`);
  }
}

testUSDToken();