import { CloverClient, type CloverConfig, type Customer } from './clover-client';
import { db } from './db';
import { CloverCustomerSchema, type CloverCustomer } from './clover-schemas';

interface SyncConfig {
  merchantId: string;
  apiToken: string;
  currency: 'USD' | 'CAD';
  environment: 'sandbox' | 'production';
}

export class CloverSyncService {
  private clients: { [key: string]: CloverClient } = {};
  private configs: SyncConfig[] = [];

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    // Initialize USD client if enabled
    if (process.env.CLOVER_USD_ENABLED === 'true' && 
        process.env.CLOVER_USD_MERCHANT_ID && 
        process.env.CLOVER_USD_API_TOKEN) {
      const usdConfig: CloverConfig = {
        merchantId: process.env.CLOVER_USD_MERCHANT_ID,
        apiToken: process.env.CLOVER_USD_API_TOKEN,
        environment: (process.env.CLOVER_ENV || 'production') as 'sandbox' | 'production',
        currency: 'USD'
      };
      this.clients['USD'] = new CloverClient(usdConfig);
      this.configs.push({
        merchantId: usdConfig.merchantId,
        apiToken: usdConfig.apiToken,
        currency: 'USD',
        environment: usdConfig.environment
      });
    }

    // Initialize CAD client if enabled
    if (process.env.CLOVER_CAD_ENABLED === 'true' && 
        process.env.CLOVER_CAD_MERCHANT_ID && 
        process.env.CLOVER_CAD_API_TOKEN) {
      const cadConfig: CloverConfig = {
        merchantId: process.env.CLOVER_CAD_MERCHANT_ID,
        apiToken: process.env.CLOVER_CAD_API_TOKEN,
        environment: (process.env.CLOVER_ENV || 'production') as 'sandbox' | 'production',
        currency: 'CAD'
      };
      this.clients['CAD'] = new CloverClient(cadConfig);
      this.configs.push({
        merchantId: cadConfig.merchantId,
        apiToken: cadConfig.apiToken,
        currency: 'CAD',
        environment: cadConfig.environment
      });
    }

    console.log(`[CloverSync] Initialized ${Object.keys(this.clients).length} Clover clients:`, Object.keys(this.clients));
  }

  async syncAllCustomers(): Promise<{ success: boolean; stats: any; errors: any[] }> {
    const stats = {
      totalCustomers: 0,
      customersByMerchant: {},
      syncStartTime: new Date(),
      syncEndTime: null as Date | null
    };
    const errors: any[] = [];

    console.log('[CloverSync] Starting sync of all customers...');

    try {
      // Clear existing test data
      console.log('[CloverSync] Clearing existing test data...');
      this.clearTestData();

      // Sync customers for each enabled merchant
      for (const config of this.configs) {
        console.log(`[CloverSync] Syncing customers for ${config.currency} merchant: ${config.merchantId}`);
        
        try {
          const client = this.clients[config.currency];
          
          // Fetch ALL customers with pagination
          const allCustomers: Customer[] = [];
          let offset = 0;
          const limit = 100;
          let hasMore = true;

          while (hasMore) {
            console.log(`[CloverSync] Fetching batch: offset=${offset}, limit=${limit}`);
            const customers = await client.getCustomersPaginated(limit, offset);
            
            if (customers.length === 0) {
              hasMore = false;
            } else {
              allCustomers.push(...customers);
              offset += limit;
              
              // If we got less than the limit, we've reached the end
              if (customers.length < limit) {
                hasMore = false;
              }
            }
          }

          console.log(`[CloverSync] Fetched ${allCustomers.length} total customers from ${config.currency} merchant`);
          
          // Store customers in database
          let syncedCount = 0;
          for (const customer of allCustomers) {
            try {
              await this.storeCustomer(customer, config);
              syncedCount++;
            } catch (error) {
              console.error(`[CloverSync] Error storing customer ${customer.id}:`, error);
              errors.push({
                merchantId: config.merchantId,
                customerId: customer.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }

          stats.customersByMerchant[config.currency] = {
            fetched: allCustomers.length,
            synced: syncedCount,
            errors: allCustomers.length - syncedCount
          };
          stats.totalCustomers += syncedCount;

        } catch (error) {
          console.error(`[CloverSync] Error syncing ${config.currency} merchant:`, error);
          errors.push({
            merchantId: config.merchantId,
            currency: config.currency,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      stats.syncEndTime = new Date();
      const duration = stats.syncEndTime.getTime() - stats.syncStartTime.getTime();
      
      console.log(`[CloverSync] Sync completed in ${duration}ms`);
      console.log(`[CloverSync] Stats:`, stats);
      
      if (errors.length > 0) {
        console.log(`[CloverSync] ${errors.length} errors occurred:`, errors);
      }

      return {
        success: errors.length === 0,
        stats,
        errors
      };

    } catch (error) {
      console.error('[CloverSync] Fatal sync error:', error);
      stats.syncEndTime = new Date();
      
      return {
        success: false,
        stats,
        errors: [{
          error: error instanceof Error ? error.message : 'Unknown fatal error'
        }]
      };
    }
  }

  private clearTestData() {
    // Remove test data (anything starting with 'CUST_', 'EMAIL_', etc.)
    const tables = ['orders', 'cards', 'phoneNumbers', 'emailAddresses', 'addresses', 'metadata', 'customers'];
    
    for (const table of tables) {
      try {
        if (table === 'customers') {
          db.prepare(`DELETE FROM ${table} WHERE id LIKE 'CUST_%'`).run();
        } else if (table === 'addresses') {
          db.prepare(`DELETE FROM ${table} WHERE customerId LIKE 'CUST_%'`).run();
        } else {
          db.prepare(`DELETE FROM ${table} WHERE customerId LIKE 'CUST_%'`).run();
        }
      } catch (error) {
        console.warn(`[CloverSync] Warning clearing ${table}:`, error);
      }
    }
    console.log('[CloverSync] Test data cleared');
  }

  private async storeCustomer(customer: Customer, config: SyncConfig) {
    // Validate customer data with Zod
    const validatedCustomer = CloverCustomerSchema.parse({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      customerSince: customer.customerSince,
      marketingAllowed: customer.marketingAllowed || false,
      addresses: customer.addresses || [],
      emailAddresses: customer.emailAddresses || [],
      phoneNumbers: customer.phoneNumbers || [],
      cards: customer.cards || [],
      orders: customer.orders || [],
      metadata: customer.metadata || {}
    });

    // Insert customer
    db.prepare(`
      INSERT OR REPLACE INTO customers (
        id, merchantId, merchantCurrency, firstName, lastName, 
        customerSince, marketingAllowed, lastSyncedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      validatedCustomer.id,
      config.merchantId,
      config.currency,
      validatedCustomer.firstName || null,
      validatedCustomer.lastName || null,
      validatedCustomer.customerSince || null,
      validatedCustomer.marketingAllowed ? 1 : 0,
      Math.floor(Date.now() / 1000)
    );

    // Insert metadata if exists
    if (validatedCustomer.metadata && validatedCustomer.metadata.businessName) {
      db.prepare(`
        INSERT OR REPLACE INTO metadata (
          customerId, businessName, note, dobYear, dobMonth, dobDay, 
          modifiedTime, rawMetadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        validatedCustomer.id,
        validatedCustomer.metadata.businessName || null,
        validatedCustomer.metadata.note || null,
        validatedCustomer.metadata.dobYear || null,
        validatedCustomer.metadata.dobMonth || null,
        validatedCustomer.metadata.dobDay || null,
        validatedCustomer.metadata.modifiedTime || null,
        JSON.stringify(validatedCustomer.metadata)
      );
    }

    // Insert email addresses
    for (const email of validatedCustomer.emailAddresses || []) {
      if (email.id && email.emailAddress) {
        db.prepare(`
          INSERT OR REPLACE INTO emailAddresses (
            id, customerId, emailAddress, verifiedTime, primaryEmail
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          email.id,
          validatedCustomer.id,
          email.emailAddress,
          email.verifiedTime || null,
          email.primaryEmail ? 1 : 0
        );
      }
    }

    // Insert phone numbers
    for (const phone of validatedCustomer.phoneNumbers || []) {
      if (phone.id && phone.phoneNumber) {
        db.prepare(`
          INSERT OR REPLACE INTO phoneNumbers (
            id, customerId, phoneNumber
          ) VALUES (?, ?, ?)
        `).run(
          phone.id,
          validatedCustomer.id,
          phone.phoneNumber
        );
      }
    }

    // Insert addresses (no IDs in Clover, use customer ID + index)
    db.prepare(`DELETE FROM addresses WHERE customerId = ?`).run(validatedCustomer.id);
    validatedCustomer.addresses?.forEach((address, index) => {
      db.prepare(`
        INSERT INTO addresses (
          customerId, address1, address2, address3, city, state, zip, country
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        validatedCustomer.id,
        address.address1 || null,
        address.address2 || null,
        address.address3 || null,
        address.city || null,
        address.state || null,
        address.zip || null,
        address.country || null
      );
    });

    // Insert cards
    for (const card of validatedCustomer.cards || []) {
      if (card.id) {
        db.prepare(`
          INSERT OR REPLACE INTO cards (
            id, customerId, first6, last4, firstName, lastName, 
            expirationDate, cardType, token, tokenType, modifiedTime, additionalInfo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          card.id,
          validatedCustomer.id,
          card.first6 || null,
          card.last4 || null,
          card.firstName || null,
          card.lastName || null,
          card.expirationDate || null,
          card.cardType || null,
          card.token || null,
          card.tokenType || null,
          card.modifiedTime || null,
          card.additionalInfo ? JSON.stringify(card.additionalInfo) : null
        );
      }
    }

    // Insert orders
    for (const order of validatedCustomer.orders || []) {
      if (order.id) {
        db.prepare(`
          INSERT OR REPLACE INTO orders (
            id, customerId
          ) VALUES (?, ?)
        `).run(
          order.id,
          validatedCustomer.id
        );
      }
    }
  }

  async getStats(): Promise<any> {
    const totalCustomers = db.prepare(`SELECT COUNT(*) as count FROM customers`).get() as { count: number };
    const customersByMerchant = db.prepare(`
      SELECT merchantCurrency, COUNT(*) as count 
      FROM customers 
      GROUP BY merchantCurrency
    `).all();
    const customersWithCards = db.prepare(`
      SELECT COUNT(DISTINCT customerId) as count 
      FROM cards
    `).get() as { count: number };
    const customersWithBusinessName = db.prepare(`
      SELECT COUNT(*) as count 
      FROM metadata 
      WHERE businessName IS NOT NULL
    `).get() as { count: number };

    return {
      totalCustomers: totalCustomers.count,
      customersByMerchant,
      customersWithCards: customersWithCards.count,
      customersWithBusinessName: customersWithBusinessName.count,
      lastSyncTime: new Date().toISOString()
    };
  }
}