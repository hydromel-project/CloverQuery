/**
 * Client Status Analysis System
 * Analyzes customers for payment method setup requirements
 */

import type { Customer } from './clover-client';

export interface ClientStatus {
  status: 'new-needs-payment' | 'expired-cards' | 'expiring-cards' | 'all-good' | 'inactive-old';
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  daysOld: number;
  hasCards: boolean;
  requiresAction: boolean;
  actionMessage: string;
}

export interface CustomerWithStatus extends Customer {
  merchantCurrency: string;
  clientStatus: ClientStatus;
  expirationAnalysis?: Array<{
    card: any;
    expiration: any;
  }>;
}

export class ClientStatusAnalyzer {
  /**
   * Get current date
   */
  private getCurrentDate(): Date {
    return new Date(); // Production mode
  }

  /**
   * Calculate days since customer was created
   */
  private getDaysSinceCreated(createdTime: number): number {
    const now = this.getCurrentDate();
    const createdDate = new Date(createdTime);
    const timeDiff = now.getTime() - createdDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Check if customer has any cards
   */
  private hasPaymentMethods(customer: Customer): boolean {
    // Handle both flat array and nested API structure
    if (Array.isArray(customer.cards) && customer.cards.length > 0) {
      return true;
    }
    if (customer.cards && customer.cards.elements && customer.cards.elements.length > 0) {
      return true;
    }
    return false;
  }

  /**
   * Analyze client status based on age and payment methods
   */
  analyzeClientStatus(customer: Customer, expirationAnalysis?: any[]): ClientStatus {
    const createdTime = customer.createdTime || customer.customerSince;
    const hasCards = this.hasPaymentMethods(customer);
    
    // If no creation date, assume old customer
    if (!createdTime) {
      return {
        status: hasCards ? 'all-good' : 'inactive-old',
        priority: 'none',
        daysOld: 999,
        hasCards,
        requiresAction: false,
        actionMessage: hasCards ? 'Customer is set up properly' : 'Old customer - no action needed'
      };
    }

    const daysOld = this.getDaysSinceCreated(createdTime);

    // Check for expired/expiring cards first (highest priority)
    if (hasCards && expirationAnalysis) {
      const hasExpiredCards = expirationAnalysis.some(analysis => 
        analysis.expiration.status === 'expired'
      );
      const hasExpiringSoonCards = expirationAnalysis.some(analysis => 
        analysis.expiration.status === 'expiring-soon'
      );

      if (hasExpiredCards) {
        return {
          status: 'expired-cards',
          priority: 'critical',
          daysOld,
          hasCards,
          requiresAction: true,
          actionMessage: 'URGENT: Customer has expired credit cards'
        };
      }

      if (hasExpiringSoonCards) {
        return {
          status: 'expiring-cards',
          priority: 'high',
          daysOld,
          hasCards,
          requiresAction: true,
          actionMessage: 'Customer has cards expiring soon'
        };
      }
    }

    // New customers without payment methods (within 6 months / 180 days)
    if (!hasCards && daysOld <= 180) {
      return {
        status: 'new-needs-payment',
        priority: 'high',
        daysOld,
        hasCards,
        requiresAction: true,
        actionMessage: 'New customer needs payment method setup'
      };
    }

    // Old customers without payment methods (over 365 days)
    if (!hasCards && daysOld > 365) {
      return {
        status: 'inactive-old',
        priority: 'none',
        daysOld,
        hasCards,
        requiresAction: false,
        actionMessage: 'Old inactive customer - no action needed'
      };
    }

    // Customers without cards but in the middle range (181-365 days)
    if (!hasCards) {
      return {
        status: 'inactive-old',
        priority: 'low',
        daysOld,
        hasCards,
        requiresAction: false,
        actionMessage: 'Customer has not set up payment methods'
      };
    }

    // Customers with cards and no expiration issues
    return {
      status: 'all-good',
      priority: 'none',
      daysOld,
      hasCards,
      requiresAction: false,
      actionMessage: 'Customer is set up properly'
    };
  }

  /**
   * Analyze multiple customers with their expiration data
   */
  analyzeCustomersWithStatus(
    customersWithExpiration: Array<Customer & { merchantCurrency: string; expirationAnalysis?: any[] }>
  ): CustomerWithStatus[] {
    return customersWithExpiration.map(customer => ({
      ...customer,
      clientStatus: this.analyzeClientStatus(customer, customer.expirationAnalysis)
    }));
  }

  /**
   * Filter customers by status
   */
  filterByClientStatus(
    customers: CustomerWithStatus[],
    statuses: ClientStatus['status'][]
  ): CustomerWithStatus[] {
    return customers.filter(customer =>
      statuses.includes(customer.clientStatus.status)
    );
  }

  /**
   * Get customers requiring action (not 'all-good' or 'inactive-old')
   */
  getCustomersRequiringAction(customers: CustomerWithStatus[]): CustomerWithStatus[] {
    return customers.filter(customer => customer.clientStatus.requiresAction);
  }

  /**
   * Generate status summary
   */
  generateStatusSummary(customers: CustomerWithStatus[]) {
    const total = customers.length;
    
    const newNeedsPayment = customers.filter(c => c.clientStatus.status === 'new-needs-payment');
    const expiredCards = customers.filter(c => c.clientStatus.status === 'expired-cards');
    const expiringCards = customers.filter(c => c.clientStatus.status === 'expiring-cards');
    const allGood = customers.filter(c => c.clientStatus.status === 'all-good');
    const inactiveOld = customers.filter(c => c.clientStatus.status === 'inactive-old');
    
    const requiresAction = customers.filter(c => c.clientStatus.requiresAction);

    return {
      total,
      newNeedsPayment: newNeedsPayment.length,
      expiredCards: expiredCards.length,
      expiringCards: expiringCards.length,
      allGood: allGood.length,
      inactiveOld: inactiveOld.length,
      requiresAction: requiresAction.length,
      breakdown: {
        newNeedsPayment,
        expiredCards,
        expiringCards,
        allGood,
        inactiveOld
      }
    };
  }
}