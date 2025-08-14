#!/usr/bin/env tsx

/**
 * Test CAD Merchant Access to Verify Token Works
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const API_TOKEN = '67d937f4-bd62-ae0c-f218-f65b1913d5cf';
const BASE_URL = 'https://api.clover.com';
const CAD_MERCHANT_ID = '0PVV4T89B8J51';
const CAD_MID = '318002902448';

async function testCADAccess() {
  console.log('🧪 Testing CAD Merchant Access');
  console.log(`📋 Token: ${API_TOKEN}`);
  console.log(`🏢 CAD Merchant ID: ${CAD_MERCHANT_ID}`);
  console.log(`🆔 CAD MID: ${CAD_MID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('\n🔍 Testing CAD merchant access...');
    const response = await fetch(`${BASE_URL}/v3/merchants/${CAD_MERCHANT_ID}/customers?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ CAD merchant access WORKS');
      console.log(`📊 Sample data: ${JSON.stringify(data).substring(0, 200)}...`);
      
      // Test listing accessible merchants
      console.log('\n🔍 Testing merchant list...');
      const merchantsResponse = await fetch(`${BASE_URL}/v3/merchants`, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json',
        },
      });
      
      if (merchantsResponse.ok) {
        const merchants = await merchantsResponse.json();
        console.log('✅ Accessible merchants:');
        console.log(JSON.stringify(merchants, null, 2));
      } else {
        console.log(`❌ Merchants list failed: ${merchantsResponse.status}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log(`❌ CAD merchant access FAILED: ${errorText}`);
    }
    
  } catch (error) {
    console.log(`💥 Exception: ${error}`);
  }
}

testCADAccess();