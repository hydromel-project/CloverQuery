#!/usr/bin/env tsx

/**
 * Test USD Merchant Access with Different Approaches
 * 
 * This script tests various ways to access the USD merchant data:
 * 1. Using merchant ID (KWTTVV51DE3X1)
 * 2. Using MID (318002902450)
 * 3. Testing different API endpoints
 * 4. Checking merchant permissions
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve('.env') });

const API_TOKEN = '67d937f4-bd62-ae0c-f218-f65b1913d5cf';
const BASE_URL = 'https://api.clover.com';

// Different merchant identifiers to test
const USD_MERCHANT_ID = 'KWTTVV51DE3X1';
const USD_MID = '318002902450';

async function makeRequest(endpoint: string, description: string) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`   URL: ${BASE_URL}${endpoint}`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`   ✅ Success: ${JSON.stringify(data).substring(0, 200)}...`);
    return data;
    
  } catch (error) {
    console.log(`   💥 Exception: ${error}`);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing USD Merchant Access Methods');
  console.log(`📋 Token: ${API_TOKEN}`);
  console.log(`🏢 Merchant ID: ${USD_MERCHANT_ID}`);
  console.log(`🆔 MID: ${USD_MID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 1: Standard merchant ID approach
  await makeRequest(
    `/v3/merchants/${USD_MERCHANT_ID}/customers?limit=1`,
    'Standard merchant ID customers endpoint'
  );

  // Test 2: Using MID instead of merchant ID
  await makeRequest(
    `/v3/merchants/${USD_MID}/customers?limit=1`,
    'MID as merchant identifier'
  );

  // Test 3: Check merchant info with merchant ID
  await makeRequest(
    `/v3/merchants/${USD_MERCHANT_ID}`,
    'Merchant info with merchant ID'
  );

  // Test 4: Check merchant info with MID
  await makeRequest(
    `/v3/merchants/${USD_MID}`,
    'Merchant info with MID'
  );

  // Test 5: List accessible merchants
  await makeRequest(
    '/v3/merchants',
    'List all accessible merchants'
  );

  // Test 6: Try alternative customers endpoint
  await makeRequest(
    `/v3/merchants/${USD_MERCHANT_ID}/customers?expand=cards,addresses,emailAddresses,phoneNumbers,metadata&limit=1`,
    'Full expanded customers with merchant ID'
  );

  // Test 7: Try alternative customers endpoint with MID
  await makeRequest(
    `/v3/merchants/${USD_MID}/customers?expand=cards,addresses,emailAddresses,phoneNumbers,metadata&limit=1`,
    'Full expanded customers with MID'
  );

  // Test 8: Check orders endpoint (sometimes has different permissions)
  await makeRequest(
    `/v3/merchants/${USD_MERCHANT_ID}/orders?limit=1`,
    'Orders endpoint with merchant ID'
  );

  // Test 9: Check orders endpoint with MID
  await makeRequest(
    `/v3/merchants/${USD_MID}/orders?limit=1`,
    'Orders endpoint with MID'
  );

  // Test 10: Try accessing a specific resource to understand scope
  await makeRequest(
    `/v3/merchants/${USD_MERCHANT_ID}/apps`,
    'Apps endpoint with merchant ID'
  );

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏁 Testing completed. Check results above.');
  console.log('💡 If MID works but merchant ID doesn\'t, we can update the configuration.');
}

// Run the test
main().catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});