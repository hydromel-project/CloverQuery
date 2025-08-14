import type { Route } from "./+types/customers";
import { useLoaderData, Link } from "react-router";
import { useState, useMemo } from "react";
import { useLanguage, LanguageSelector } from "~/lib/language-context";

export function meta() {
  return [
    { title: "Customers - Clover Query" },
    { name: "description", content: "Customer management with smart filtering" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Fetch all customers at once for client-side filtering
  const apiUrl = new URL('/api/customers', request.url);
  apiUrl.searchParams.set('all', 'true');
  
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  return data;
}

// Card brand detection with better logos
function getCardBrand(first6: string) {
  if (!first6) return { brand: 'Unknown', logo: '💳', color: 'text-gray-500' };
  
  const firstDigit = first6[0];
  const firstTwo = first6.substring(0, 2);
  
  if (firstDigit === '4') return { brand: 'Visa', logo: 'V', color: 'text-blue-600' };
  if (['51', '52', '53', '54', '55'].includes(firstTwo)) return { brand: 'MC', logo: 'M', color: 'text-red-600' };
  if (['34', '37'].includes(firstTwo)) return { brand: 'Amex', logo: 'A', color: 'text-blue-700' };
  if (first6.startsWith('6011') || first6.startsWith('65')) return { brand: 'Disc', logo: 'D', color: 'text-orange-600' };
  
  return { brand: 'Card', logo: 'C', color: 'text-gray-500' };
}

function CompactCustomerCard({ customer }: { customer: any }) {
  const { t } = useLanguage();
  const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || t('no-name');
  const businessName = customer.businessName;
  
  // Card analysis
  const cards = customer.cards || [];
  const expiredCards = cards.filter((c: any) => c.status === 'expired');
  const expiringSoonCards = cards.filter((c: any) => c.status === 'expiring-soon');
  
  // Check if new customer (using same logic as action required)
  const now = Date.now();
  const cleanupDate = new Date('2025-07-21').getTime();
  const threeMonthsAgo = now - (90 * 24 * 60 * 60 * 1000);
  const hasCards = cards.length > 0;
  const isNewCustomer = customer.customerSince && (
    hasCards ? customer.customerSince >= threeMonthsAgo : customer.customerSince >= cleanupDate
  );
  
  // Check for recently expired (within 6 months)
  const recentlyExpiredCards = expiredCards.filter((card: any) => {
    const daysOverdue = Math.abs(card.daysUntil);
    return daysOverdue <= 180;
  });
  
  // Status determination
  let status = 'active';
  let statusColor = 'bg-green-500';
  let urgency = 0;
  
  if (expiredCards.length > 0) {
    status = 'expired';
    statusColor = 'bg-red-500';
    urgency = 3;
  } else if (expiringSoonCards.length > 0) {
    status = 'expiring';
    statusColor = 'bg-orange-500';
    urgency = 2;
  } else if (cards.length === 0) {
    status = 'no-cards';
    statusColor = 'bg-purple-500';
    urgency = 1;
  }
  
  // Time calculations
  const formatDaysAgo = (timestamp: number) => {
    if (!timestamp) return null;
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return t('today');
    if (days === 1) return '1j';
    if (days < 30) return `${days}j`;
    if (days < 365) return `${Math.floor(days / 30)}m`;
    return `${Math.floor(days / 365)}a`;
  };
  
  const customerAge = formatDaysAgo(customer.customerSince);
  const lastSync = formatDaysAgo(customer.lastSyncedAt ? customer.lastSyncedAt * 1000 : null);
  
  return (
    <div className={`
      bg-white rounded-lg border-2 p-3 hover:shadow-lg transition-all cursor-pointer
      ${status === 'expired' ? 'border-red-200 hover:border-red-400' : ''}
      ${status === 'expiring' ? 'border-orange-200 hover:border-orange-400' : ''}
      ${status === 'no-cards' ? 'border-purple-200 hover:border-purple-400' : ''}
      ${status === 'active' ? 'border-gray-200 hover:border-gray-400' : ''}
    `}>
      {/* Status indicator and basic info */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
            <h3 className="font-semibold text-gray-900 truncate">
              {businessName || name}
            </h3>
            {isNewCustomer && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">NEW</span>
            )}
          </div>
          {businessName && name !== 'No Name' && (
            <p className="text-xs text-gray-600 truncate mt-0.5">{name}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${
          customer.merchantCurrency === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {customer.merchantCurrency}
        </span>
      </div>
      
      {/* Contact info - compact */}
      <div className="text-xs text-gray-600 space-y-0.5 mb-2">
        {customer.primaryEmail && (
          <div className="truncate">📧 {customer.primaryEmail}</div>
        )}
        {customer.primaryPhone && (
          <div>📞 {customer.primaryPhone}</div>
        )}
      </div>
      
      {/* Card status - most important info */}
      {(expiredCards.length > 0 || expiringSoonCards.length > 0) ? (
        <div className="bg-gray-900 rounded p-2 mb-2">
          {[...expiredCards, ...expiringSoonCards].slice(0, 2).map((card, idx) => {
            const brand = getCardBrand(card.card.first6);
            const daysOverdue = card.status === 'expired' ? Math.abs(card.daysUntil) : card.daysUntil;
            
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="font-bold text-white bg-gray-700 px-1 rounded">{brand.logo}</span>
                  <span className="text-gray-300">****{card.card.last4}</span>
                </span>
                <span className={`font-bold ${
                  card.status === 'expired' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {card.status === 'expired' ? `${daysOverdue}j ${t('overdue')}` : `${daysOverdue}j ${t('days-left')}`}
                </span>
              </div>
            );
          })}
          {[...expiredCards, ...expiringSoonCards].length > 2 && (
            <div className="text-xs text-gray-400 mt-1">
              +{[...expiredCards, ...expiringSoonCards].length - 2} more cards
            </div>
          )}
        </div>
      ) : cards.length > 0 ? (
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          <span className="text-green-600 font-bold">✓</span>
          <span>{cards.length} {cards.length === 1 ? t('active-card') : t('active-cards')}</span>
        </div>
      ) : (
        <div className="bg-purple-50 rounded px-2 py-1 mb-2">
          <div className="flex items-center gap-2 text-xs text-purple-700 font-medium">
            <span>⚠️</span>
            <span>{t('no-payment-method')}</span>
          </div>
        </div>
      )}
      
      {/* Footer - metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
        <span>Client {customerAge || t('new')}</span>
        <span>{t('updated')} {lastSync || '?'}</span>
      </div>
    </div>
  );
}

type FilterType = 'all' | 'action-required' | 'expired' | 'expiring' | 'no-cards' | 'active';

export default function Customers() {
  const { t } = useLanguage();
  const initialData = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState<FilterType>('action-required');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'urgency' | 'name' | 'recent'>('urgency');
  
  // Categorize customers
  const categorizedCustomers = useMemo(() => {
    const customers = initialData.customers;
    const now = Date.now();
    // Special threshold for cleanup: 24 days ago from 2025-08-14
    const cleanupDate = new Date('2025-07-21').getTime(); // 24 days before 2025-08-14
    const threeMonthsAgo = now - (90 * 24 * 60 * 60 * 1000);
    
    return {
      expired: customers.filter(c => c.hasExpired),
      expiring: customers.filter(c => c.hasExpiringSoon && !c.hasExpired),
      noCards: customers.filter(c => c.totalCards === 0),
      active: customers.filter(c => c.totalCards > 0 && !c.hasExpired && !c.hasExpiringSoon),
      actionRequired: customers.filter(c => {
        // Must have a business name (not walk-ins)
        if (!c.businessName || c.businessName.trim() === '') return false;
        
        // Check if new customer (added after cleanup date OR in last 3 months for cards)
        // For customers without cards: must be added after cleanup date (2025-07-21)
        // For customers with cards: use regular 3-month threshold
        const hasCards = c.totalCards > 0;
        const isNewCustomer = c.customerSince && (
          hasCards ? c.customerSince >= threeMonthsAgo : c.customerSince >= cleanupDate
        );
        
        // Check if has cards expiring soon (next 30 days)
        const hasExpiringSoon = c.hasExpiringSoon;
        
        // Check if has cards overdue but not more than 6 months
        let hasRecentlyExpired = false;
        if (c.cards) {
          hasRecentlyExpired = c.cards.some((card: any) => {
            if (card.status === 'expired') {
              const daysOverdue = Math.abs(card.daysUntil);
              return daysOverdue <= 180; // 6 months = ~180 days
            }
            return false;
          });
        }
        
        // Customer needs attention if any condition is met
        return isNewCustomer || hasExpiringSoon || hasRecentlyExpired;
      })
    };
  }, [initialData.customers]);
  
  // Filter and sort customers
  const displayCustomers = useMemo(() => {
    let filtered = initialData.customers;
    
    // Apply filter
    switch (filter) {
      case 'action-required':
        filtered = categorizedCustomers.actionRequired;
        break;
      case 'expired':
        filtered = categorizedCustomers.expired;
        break;
      case 'expiring':
        filtered = categorizedCustomers.expiring;
        break;
      case 'no-cards':
        filtered = categorizedCustomers.noCards;
        break;
      case 'active':
        filtered = categorizedCustomers.active;
        break;
    }
    
    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => {
        const name = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
        const business = (customer.businessName || '').toLowerCase();
        const email = (customer.primaryEmail || '').toLowerCase();
        const phone = (customer.primaryPhone || '').toLowerCase();
        
        return name.includes(search) || 
               business.includes(search) || 
               email.includes(search) || 
               phone.includes(search);
      });
    }
    
    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'urgency':
        sorted.sort((a, b) => {
          // Priority: expired > expiring > no cards > active
          const getUrgency = (c: any) => {
            if (c.hasExpired) return 4;
            if (c.hasExpiringSoon) return 3;
            if (c.totalCards === 0) return 2;
            return 1;
          };
          return getUrgency(b) - getUrgency(a);
        });
        break;
      case 'name':
        sorted.sort((a, b) => {
          const nameA = (a.businessName || `${a.firstName} ${a.lastName}`).toLowerCase();
          const nameB = (b.businessName || `${b.firstName} ${b.lastName}`).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case 'recent':
        sorted.sort((a, b) => (b.customerSince || 0) - (a.customerSince || 0));
        break;
    }
    
    return sorted;
  }, [initialData.customers, filter, searchTerm, sortBy, categorizedCustomers]);
  
  const stats = {
    total: initialData.customers.length,
    actionRequired: categorizedCustomers.actionRequired.length,
    expired: categorizedCustomers.expired.length,
    expiring: categorizedCustomers.expiring.length,
    noCards: categorizedCustomers.noCards.length,
    active: categorizedCustomers.active.length
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('customer-management')}</h1>
              <p className="text-sm text-gray-600">
                {t('showing')} {displayCustomers.length} {t('of')} {stats.total} {t('customers')} • {stats.actionRequired} {t('need-attention')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <button
                onClick={() => {
                  // Open print view in new window
                  const params = new URLSearchParams({
                    filter: filter,
                    search: searchTerm,
                    sort: sortBy
                  });
                  window.open(`/customers/print?${params.toString()}`, '_blank');
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
              >
                <span>🖨️</span>
                <span>{t('print-list')}</span>
              </button>
              <Link 
                to="/dashboard" 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                {t('dashboard')}
              </Link>
              <Link 
                to="/admin" 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                {t('admin')}
              </Link>
            </div>
          </div>
          
          {/* Search and Sort */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder={t('search-customers')}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="urgency">{t('sort-by-urgency')}</option>
              <option value="name">{t('sort-by-name')}</option>
              <option value="recent">{t('sort-by-recent')}</option>
            </select>
          </div>
          
          {/* Smart Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('action-required')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'action-required' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={t('action-required-tooltip')}
            >
              🚨 {t('action-required')} ({stats.actionRequired})
            </button>
            
            <button
              onClick={() => setFilter('expired')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'expired' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('expired')} ({stats.expired})
            </button>
            
            <button
              onClick={() => setFilter('expiring')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'expiring' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('expiring')} ({stats.expiring})
            </button>
            
            <button
              onClick={() => setFilter('no-cards')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'no-cards' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('no-cards')} ({stats.noCards})
            </button>
            
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'active' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('active')} ({stats.active})
            </button>
            
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('all')} ({stats.total})
            </button>
          </div>
        </div>
      </div>
      
      {/* Customer Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {displayCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayCustomers.map((customer: any) => (
              <CompactCustomerCard key={customer.id} customer={customer} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🔍</div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">{t('no-customers-found')}</h2>
            <p className="text-gray-600">
              {searchTerm 
                ? t('try-adjusting-search')
                : t('no-customers-match')}
            </p>
          </div>
        )}
      </div>
      
      {/* Quick Stats Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              {t('expired')}: {stats.expired}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              {t('expiring')}: {stats.expiring}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              {t('no-cards')}: {stats.noCards}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {t('active')}: {stats.active}
            </span>
          </div>
          <div>
            {t('last-sync')}: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}