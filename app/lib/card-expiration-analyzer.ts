/**
 * Credit Card Expiration Analysis System
 */

import type { Customer, CustomerCard } from './clover-client';

export interface ExpirationStatus {
  status: 'expired' | 'expiring-soon' | 'expiring-later' | 'valid';
  daysUntilExpiration: number;
  expirationDate: Date;
  warningLevel: 'critical' | 'warning' | 'info' | 'none';
}

export interface CustomerWithExpiration extends Customer {
  merchantCurrency: string;
  expirationAnalysis: Array<{
    card: CustomerCard;
    expiration: ExpirationStatus;
  }>;
}

export class CardExpirationAnalyzer {
  /**
   * Parse MMYY expiration date format to Date object
   */
  private parseExpirationDate(expirationDate: string | null | undefined): Date | null {
    if (!expirationDate || expirationDate.length !== 4) {
      return null; // Return null for missing or invalid expiration dates
    }

    const month = parseInt(expirationDate.substring(0, 2), 10);
    const year = parseInt(expirationDate.substring(2, 4), 10) + 2000;

    // Card expires on the last day of the expiration month
    return new Date(year, month - 1, this.getLastDayOfMonth(year, month));
  }

  private getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Calculate days until expiration
   */
  private getDaysUntilExpiration(expirationDate: Date): number {
    const now = new Date(); // Production mode
    
    const timeDiff = expirationDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Analyze card expiration status
   */
  analyzeCardExpiration(expirationDate: string | null | undefined): ExpirationStatus | null {
    try {
      const expDate = this.parseExpirationDate(expirationDate);
      
      // Return null for cards without expiration dates
      if (!expDate) {
        return null;
      }
      
      const daysUntil = this.getDaysUntilExpiration(expDate);

      // Removed debug logging for production

      let status: ExpirationStatus['status'];
      let warningLevel: ExpirationStatus['warningLevel'];

      if (daysUntil < 0) {
        status = 'expired';
        warningLevel = 'critical';
      } else if (daysUntil <= 30) {
        status = 'expiring-soon';
        warningLevel = 'critical';
      } else if (daysUntil <= 90) {
        status = 'expiring-later';
        warningLevel = 'warning';
      } else {
        status = 'valid';
        warningLevel = 'none';
      }

      return {
        status,
        daysUntilExpiration: daysUntil,
        expirationDate: expDate,
        warningLevel,
      };
    } catch (error) {
      console.error(`Error parsing expiration date ${expirationDate}:`, error);
      return {
        status: 'valid',
        daysUntilExpiration: Infinity,
        expirationDate: new Date(),
        warningLevel: 'none',
      };
    }
  }

  /**
   * Analyze all customers and their cards
   */
  analyzeCustomers(
    customers: Array<Customer & { merchantCurrency: string }>
  ): CustomerWithExpiration[] {
    return customers.map(customer => {
      // Handle both flat array and Clover API nested structure
      let cards: any[] = [];
      
      if (Array.isArray(customer.cards)) {
        // Flat array format
        cards = customer.cards;
      } else if (customer.cards && customer.cards.elements && Array.isArray(customer.cards.elements)) {
        // Clover API nested format
        cards = customer.cards.elements;
      }
      
      const expirationAnalysis = cards.map(card => {
        const expiration = this.analyzeCardExpiration(card.expirationDate);
        return {
          card,
          expiration: expiration || {
            status: 'valid' as const,
            daysUntilExpiration: 999999, // Large number for cards without expiration
            expirationDate: new Date('2099-12-31'), // Far future date
            warningLevel: 'none' as const
          },
        };
      });

      return {
        ...customer,
        expirationAnalysis,
      };
    });
  }

  /**
   * Filter customers by expiration status
   */
  filterByStatus(
    customers: CustomerWithExpiration[],
    statuses: ExpirationStatus['status'][]
  ): CustomerWithExpiration[] {
    return customers.filter(customer =>
      customer.expirationAnalysis.some(analysis =>
        statuses.includes(analysis.expiration.status)
      )
    );
  }

  /**
   * Get customers with expired cards
   */
  getExpiredCards(customers: CustomerWithExpiration[]): CustomerWithExpiration[] {
    return this.filterByStatus(customers, ['expired']);
  }

  /**
   * Get customers with cards expiring soon (next 30 days)
   */
  getExpiringSoonCards(customers: CustomerWithExpiration[]): CustomerWithExpiration[] {
    return this.filterByStatus(customers, ['expiring-soon']);
  }

  /**
   * Get customers with cards expiring in 31-90 days
   */
  getExpiringLaterCards(customers: CustomerWithExpiration[]): CustomerWithExpiration[] {
    return this.filterByStatus(customers, ['expiring-later']);
  }

  /**
   * Generate summary statistics
   */
  generateSummary(customers: CustomerWithExpiration[]) {
    const totalCustomers = customers.length;
    const totalCards = customers.reduce(
      (sum, customer) => {
        const cards = Array.isArray(customer.cards) ? customer.cards : [];
        return sum + cards.length;
      },
      0
    );

    const expired = this.getExpiredCards(customers);
    const expiringSoon = this.getExpiringSoonCards(customers);
    const expiringLater = this.getExpiringLaterCards(customers);

    return {
      totalCustomers,
      totalCards,
      expired: {
        customers: expired.length,
        cards: expired.reduce((sum, c) => sum + c.expirationAnalysis.length, 0),
      },
      expiringSoon: {
        customers: expiringSoon.length,
        cards: expiringSoon.reduce((sum, c) => sum + c.expirationAnalysis.length, 0),
      },
      expiringLater: {
        customers: expiringLater.length,
        cards: expiringLater.reduce((sum, c) => sum + c.expirationAnalysis.length, 0),
      },
    };
  }
}