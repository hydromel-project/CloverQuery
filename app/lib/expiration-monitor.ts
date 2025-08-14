/**
 * Main service for monitoring credit card expiration across multiple Clover merchants
 */

import { MultiMerchantCloverClient } from './clover-client';
import { CardExpirationAnalyzer, type CustomerWithExpiration } from './card-expiration-analyzer';
import { getCloverConfigs } from './config';

export interface MerchantError {
  currency: string;
  error: string;
  status?: number;
}

export interface ExpirationMonitorResult {
  summary: {
    totalCustomers: number;
    totalCards: number;
    expired: { customers: number; cards: number };
    expiringSoon: { customers: number; cards: number };
    expiringLater: { customers: number; cards: number };
  };
  customers: {
    expired: CustomerWithExpiration[];
    expiringSoon: CustomerWithExpiration[];
    expiringLater: CustomerWithExpiration[];
  };
  byMerchant: {
    USD?: CustomerWithExpiration[];
    CAD?: CustomerWithExpiration[];
  };
  merchantErrors: MerchantError[];
}

export class ExpirationMonitorService {
  private multiClient: MultiMerchantCloverClient;
  private analyzer: CardExpirationAnalyzer;

  constructor() {
    const configs = getCloverConfigs();
    this.multiClient = new MultiMerchantCloverClient(configs);
    this.analyzer = new CardExpirationAnalyzer();
  }

  /**
   * Run complete expiration monitoring analysis
   */
  async runAnalysis(): Promise<ExpirationMonitorResult> {
    try {
      const { customers: allCustomers, errors } = await this.multiClient.getAllCustomersWithErrors();
      const analyzedCustomers = this.analyzer.analyzeCustomers(allCustomers);

      // Filter by expiration status
      const expired = this.analyzer.getExpiredCards(analyzedCustomers);
      const expiringSoon = this.analyzer.getExpiringSoonCards(analyzedCustomers);
      const expiringLater = this.analyzer.getExpiringLaterCards(analyzedCustomers);

      // Generate summary
      const summary = this.analyzer.generateSummary(analyzedCustomers);

      // Group by merchant currency
      const byMerchant: ExpirationMonitorResult['byMerchant'] = {};
      const usdCustomers = analyzedCustomers.filter(c => c.merchantCurrency === 'USD');
      const cadCustomers = analyzedCustomers.filter(c => c.merchantCurrency === 'CAD');
      
      if (usdCustomers.length > 0) byMerchant.USD = usdCustomers;
      if (cadCustomers.length > 0) byMerchant.CAD = cadCustomers;

      return {
        summary,
        customers: {
          expired,
          expiringSoon,
          expiringLater,
        },
        byMerchant,
        merchantErrors: errors,
      };
    } catch (error) {
      console.error('Error running expiration analysis:', error);
      throw error;
    }
  }

  /**
   * Get customers requiring immediate attention (expired or expiring within 30 days)
   */
  async getUrgentCustomers(): Promise<CustomerWithExpiration[]> {
    const result = await this.runAnalysis();
    return [...result.customers.expired, ...result.customers.expiringSoon];
  }

  /**
   * Get customers by merchant currency
   */
  async getCustomersByCurrency(currency: 'USD' | 'CAD'): Promise<CustomerWithExpiration[]> {
    const customers = await this.multiClient.getCustomersByCurrency(currency);
    return this.analyzer.analyzeCustomers(
      customers.map(c => ({ ...c, merchantCurrency: currency }))
    );
  }

  /**
   * Format customer data for notifications
   */
  formatCustomerForNotification(customer: CustomerWithExpiration) {
    const primaryEmail = customer.emailAddresses?.[0]?.emailAddress;
    const primaryPhone = customer.phoneNumbers?.[0]?.phoneNumber;
    const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();

    const expiringCards = customer.expirationAnalysis
      .filter(analysis => ['expired', 'expiring-soon'].includes(analysis.expiration.status))
      .map(analysis => ({
        cardType: analysis.card.cardType,
        last4: analysis.card.last4,
        expirationDate: analysis.card.expirationDate,
        daysUntilExpiration: analysis.expiration.daysUntilExpiration,
        status: analysis.expiration.status,
      }));

    return {
      customerId: customer.id,
      name: name || 'Customer',
      email: primaryEmail,
      phone: primaryPhone,
      merchantCurrency: customer.merchantCurrency,
      expiringCards,
    };
  }
}