/**
 * Configuration management for Clover multi-merchant setup
 */

import { config } from 'dotenv';
import type { CloverConfig } from './clover-client';

// Load environment variables
config();

export function getCloverConfigs(): CloverConfig[] {
  const configs: CloverConfig[] = [];

  // USD Merchant Configuration
  const usdMerchantId = process.env.CLOVER_USD_MERCHANT_ID;
  const usdApiToken = process.env.CLOVER_USD_API_TOKEN;

  if (usdMerchantId && usdApiToken) {
    configs.push({
      merchantId: usdMerchantId,
      apiToken: usdApiToken,
      environment: (process.env.CLOVER_ENV as 'sandbox' | 'production') || 'sandbox',
      currency: 'USD',
    });
  }

  // CAD Merchant Configuration
  const cadMerchantId = process.env.CLOVER_CAD_MERCHANT_ID;
  const cadApiToken = process.env.CLOVER_CAD_API_TOKEN;

  if (cadMerchantId && cadApiToken) {
    configs.push({
      merchantId: cadMerchantId,
      apiToken: cadApiToken,
      environment: (process.env.CLOVER_ENV as 'sandbox' | 'production') || 'sandbox',
      currency: 'CAD',
    });
  }

  if (configs.length === 0) {
    throw new Error('No Clover merchant configurations found. Please set environment variables.');
  }

  return configs;
}

export function validateEnvironmentVariables(): void {
  const requiredVars = [
    'CLOVER_USD_MERCHANT_ID',
    'CLOVER_USD_API_TOKEN',
    'CLOVER_CAD_MERCHANT_ID', 
    'CLOVER_CAD_API_TOKEN'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.warn(`Missing optional environment variables: ${missing.join(', ')}`);
    console.warn('At least one merchant configuration (USD or CAD) is required.');
  }

  // Check that at least one merchant is configured
  const hasUsd = process.env.CLOVER_USD_MERCHANT_ID && process.env.CLOVER_USD_API_TOKEN;
  const hasCad = process.env.CLOVER_CAD_MERCHANT_ID && process.env.CLOVER_CAD_API_TOKEN;

  if (!hasUsd && !hasCad) {
    throw new Error('At least one Clover merchant configuration is required (USD or CAD)');
  }
}

export function getCloverConfigsWithStatus() {
  const allConfigs = [];

  // USD Configuration
  if (process.env.CLOVER_USD_MERCHANT_ID && process.env.CLOVER_USD_API_TOKEN) {
    allConfigs.push({
      merchantId: process.env.CLOVER_USD_MERCHANT_ID,
      apiToken: process.env.CLOVER_USD_API_TOKEN,
      environment: (process.env.CLOVER_ENV || 'production') as 'sandbox' | 'production',
      currency: 'USD' as const,
      enabled: process.env.CLOVER_USD_ENABLED === 'true'
    });
  }

  // CAD Configuration  
  if (process.env.CLOVER_CAD_MERCHANT_ID && process.env.CLOVER_CAD_API_TOKEN) {
    allConfigs.push({
      merchantId: process.env.CLOVER_CAD_MERCHANT_ID,
      apiToken: process.env.CLOVER_CAD_API_TOKEN,
      environment: (process.env.CLOVER_ENV || 'production') as 'sandbox' | 'production',
      currency: 'CAD' as const,
      enabled: process.env.CLOVER_CAD_ENABLED === 'true'
    });
  }

  return allConfigs;
}