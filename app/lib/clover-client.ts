/**
 * Clover API Client with multi-merchant support for USD and CAD accounts
 */

import { withCache } from './cache';

export interface CloverConfig {
  merchantId: string;
  apiToken: string;
  environment: 'sandbox' | 'production';
  currency: 'USD' | 'CAD';
}

export interface CustomerCard {
  id?: string;
  first6: string;
  last4: string;
  firstName?: string;
  lastName?: string;
  expirationDate: string; // MMYY format
  cardType: string;
  token?: string;
  tokenType?: string;
  modifiedTime?: number;
  additionalInfo?: {
    default?: string;
    [key: string]: any;
  };
  customer?: {
    id: string;
  };
}

export interface CustomerAddress {
  id?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface CustomerEmail {
  id?: string;
  emailAddress: string;
  verifiedTime?: number;
  primaryEmail?: boolean;
  customer?: {
    id: string;
  };
}

export interface CustomerPhone {
  id?: string;
  phoneNumber: string;
  customer?: {
    id: string;
  };
}

export interface CustomerMetadata {
  businessName?: string;
  note?: string;
  dobYear?: number;
  dobMonth?: number;
  dobDay?: number;
  modifiedTime?: number;
  customer?: {
    id: string;
  };
  [key: string]: any;
}

export interface Customer {
  id: string;
  merchant?: {
    id: string;
  };
  firstName?: string;
  lastName?: string;
  marketingAllowed?: boolean;
  customerSince?: number;
  
  // Arrays of related data
  addresses?: CustomerAddress[];
  emailAddresses?: CustomerEmail[];
  phoneNumbers?: CustomerPhone[];
  cards?: CustomerCard[];
  
  // Metadata information
  metadata?: CustomerMetadata;
  
  // Orders (not storing for now but part of API)
  orders?: Array<{
    id: string;
  }>;
  
  // Additional fields
  createdTime?: number;
  modifiedTime?: number;
  deleted?: boolean;
  
  // Legacy fields (for backwards compatibility)
  businessName?: string;
  note?: string;
  merchantNote?: string;
}

export interface CustomersResponse {
  elements: Customer[];
  href: string;
}

export class CloverClient {
  private baseUrl: string;
  private config: CloverConfig;
  private lastRequestTime: number = 0;
  private readonly rateLimitDelay: number = 2000; // 2 seconds between requests

  constructor(config: CloverConfig) {
    this.config = config;
    this.baseUrl = this.getBaseUrl(config.environment);
  }

  private getBaseUrl(environment: string): string {
    return environment === 'sandbox' 
      ? 'https://apisandbox.dev.clover.com'
      : 'https://api.clover.com';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`[RateLimit] Waiting ${waitTime}ms before next request to ${this.config.currency} API`);
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    // Enforce rate limit before making the request
    await this.enforceRateLimit();
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Clover API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all customers for this merchant
   */
  async getCustomers(): Promise<Customer[]> {
    const response = await this.makeRequest<CustomersResponse>(
      `/v3/merchants/${this.config.merchantId}/customers`
    );
    return response.elements || [];
  }

  /**
   * Get a specific customer by ID
   */
  async getCustomer(customerId: string): Promise<Customer> {
    return this.makeRequest<Customer>(
      `/v3/merchants/${this.config.merchantId}/customers/${customerId}`
    );
  }

  /**
   * Get customers with card data and additional fields expanded (cached)
   */
  async getCustomersWithCards(): Promise<Customer[]> {
    const cacheKey = `customers_v6_production_${this.config.merchantId}_${this.config.currency}`; // v6 for production mode
    
    return withCache(cacheKey, async () => {
      // URL encode the expand parameter properly for metadata, addresses, etc.
      const expandFields = encodeURIComponent('metadata,cards,addresses,emailAddresses,phoneNumbers');
      const response = await this.makeRequest<CustomersResponse>(
        `/v3/merchants/${this.config.merchantId}/customers?expand=${expandFields}`
      );
      return response.elements || [];
    }, 24 * 60 * 60 * 1000); // Cache for 24 hours during development
  }

  /**
   * Get customers with pagination support and full expandable fields (cached)
   */
  async getCustomersPaginated(limit: number = 100, offset: number = 0): Promise<Customer[]> {
    const expandFields = 'metadata,cards,addresses,emailAddresses,phoneNumbers';
    const cacheKey = `customers_paginated_${this.config.merchantId}_${this.config.currency}_${limit}_${offset}_${expandFields}`;
    
    return withCache(cacheKey, async () => {
      const encodedExpandFields = encodeURIComponent(expandFields);
      const response = await this.makeRequest<CustomersResponse>(
        `/v3/merchants/${this.config.merchantId}/customers?expand=${encodedExpandFields}&limit=${limit}&offset=${offset}`
      );
      return response.elements || [];
    }, 24 * 60 * 60 * 1000); // Cache for 24 hours during development - full params cached
  }
}

/**
 * Multi-merchant client manager
 */
export class MultiMerchantCloverClient {
  private clients: Map<string, CloverClient> = new Map();

  constructor(configs: CloverConfig[]) {
    configs.forEach(config => {
      this.clients.set(config.currency, new CloverClient(config));
    });
  }

  /**
   * Get customers from all configured merchants with error tracking
   */
  async getAllCustomersWithErrors(): Promise<{
    customers: Array<Customer & { merchantCurrency: string }>;
    errors: Array<{ currency: string; error: string; status?: number }>;
  }> {
    const allCustomers: Array<Customer & { merchantCurrency: string }> = [];
    const errors: Array<{ currency: string; error: string; status?: number }> = [];

    for (const [currency, client] of this.clients.entries()) {
      try {
        const customers = await client.getCustomersWithCards();
        
        const customersWithCurrency = customers.map(customer => ({
          ...customer,
          merchantCurrency: currency
        }));
        allCustomers.push(...customersWithCurrency);
      } catch (error) {
        // Extract status code if available
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusMatch = errorMessage.match(/(\d{3})/);
        const status = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
        
        errors.push({
          currency,
          error: errorMessage,
          status
        });
      }
    }
    return { customers: allCustomers, errors };
  }

  /**
   * Get customers from all configured merchants (legacy method)
   */
  async getAllCustomers(): Promise<Array<Customer & { merchantCurrency: string }>> {
    const result = await this.getAllCustomersWithErrors();
    return result.customers;
  }

  /**
   * Get customers by currency
   */
  async getCustomersByCurrency(currency: 'USD' | 'CAD'): Promise<Customer[]> {
    const client = this.clients.get(currency);
    if (!client) {
      throw new Error(`No client configured for currency: ${currency}`);
    }
    return client.getCustomersWithCards();
  }
}