import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.db');
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist - matching Clover API structure
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,                    -- Clover customer ID
      merchantId TEXT NOT NULL,               -- Clover merchant ID
      merchantCurrency TEXT NOT NULL,         -- USD or CAD
      firstName TEXT,                         -- Clover camelCase
      lastName TEXT,                          -- Clover camelCase
      customerSince INTEGER,                  -- Clover camelCase, unix timestamp
      marketingAllowed INTEGER DEFAULT 0,     -- Clover camelCase
      lastSyncedAt INTEGER DEFAULT (unixepoch()),
      createdAt INTEGER DEFAULT (unixepoch()),
      updatedAt INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS addresses (
      -- Addresses don't have IDs in Clover schema, so we'll auto-generate
      _id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId TEXT NOT NULL,               -- Clover customer ID reference
      address1 TEXT,
      address2 TEXT,
      address3 TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      country TEXT,
      createdAt INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS emailAddresses (
      id TEXT PRIMARY KEY,                    -- Clover email ID
      customerId TEXT NOT NULL,               -- Clover customer ID reference
      emailAddress TEXT NOT NULL,             -- Clover camelCase
      verifiedTime INTEGER,                   -- Clover camelCase
      primaryEmail INTEGER DEFAULT 0,         -- Clover camelCase
      createdAt INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS phoneNumbers (
      id TEXT PRIMARY KEY,                    -- Clover phone ID
      customerId TEXT NOT NULL,               -- Clover customer ID reference
      phoneNumber TEXT NOT NULL,              -- Clover camelCase
      createdAt INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,                    -- Clover card ID
      customerId TEXT NOT NULL,               -- Clover customer ID reference
      first6 TEXT,
      last4 TEXT,
      firstName TEXT,
      lastName TEXT,
      expirationDate TEXT,                    -- Clover camelCase, MMYY format
      cardType TEXT,                          -- Clover camelCase
      token TEXT,
      tokenType TEXT,                         -- Clover camelCase
      modifiedTime INTEGER,                   -- Clover camelCase
      additionalInfo TEXT,                    -- JSON string
      createdAt INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,                    -- Clover order ID
      customerId TEXT NOT NULL,               -- Clover customer ID reference
      createdAt INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS metadata (
      customerId TEXT PRIMARY KEY,           -- Clover customer ID (one-to-one)
      businessName TEXT,                      -- Clover camelCase
      note TEXT,
      dobYear INTEGER,                        -- Clover camelCase
      dobMonth INTEGER,                       -- Clover camelCase
      dobDay INTEGER,                         -- Clover camelCase
      modifiedTime INTEGER,                   -- Clover camelCase
      rawMetadata TEXT,                       -- Full JSON for future fields
      createdAt INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_customers_merchant ON customers(merchantId, merchantCurrency);
    CREATE INDEX IF NOT EXISTS idx_customers_since ON customers(customerSince);
    CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses(customerId);
    CREATE INDEX IF NOT EXISTS idx_emails_customer ON emailAddresses(customerId);
    CREATE INDEX IF NOT EXISTS idx_emails_address ON emailAddresses(emailAddress);
    CREATE INDEX IF NOT EXISTS idx_emails_primary ON emailAddresses(customerId, primaryEmail);
    CREATE INDEX IF NOT EXISTS idx_phones_customer ON phoneNumbers(customerId);
    CREATE INDEX IF NOT EXISTS idx_cards_customer ON cards(customerId);
    CREATE INDEX IF NOT EXISTS idx_cards_expiration ON cards(expirationDate);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customerId);
    CREATE INDEX IF NOT EXISTS idx_metadata_business ON metadata(businessName);
  `);
}

// Initialize on import
initializeDatabase();