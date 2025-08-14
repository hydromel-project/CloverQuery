import type { Route } from "./+types/api.customers";
import { db } from "~/lib/db";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const fetchAll = url.searchParams.get('all') === 'true';
    const offset = (page - 1) * limit;

    // Get total count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM customers c
      LEFT JOIN metadata m ON c.id = m.customerId
      WHERE m.businessName IS NOT NULL
    `).get() as { total: number };
    
    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    // Get customers with basic info
    const customersQuery = `
      SELECT 
        c.id,
        c.firstName,
        c.lastName,
        c.customerSince,
        c.merchantId,
        c.merchantCurrency,
        c.marketingAllowed,
        c.lastSyncedAt,
        c.createdAt,
        c.updatedAt,
        m.businessName,
        m.note,
        m.dobYear,
        m.dobMonth,
        m.dobDay
      FROM customers c
      LEFT JOIN metadata m ON c.id = m.customerId
      WHERE m.businessName IS NOT NULL
      ORDER BY m.businessName, c.lastName, c.firstName
      ${fetchAll ? '' : 'LIMIT ? OFFSET ?'}
    `;
    
    const customers = fetchAll 
      ? db.prepare(customersQuery).all()
      : db.prepare(customersQuery).all(limit, offset);

    // Get related data for these customers
    const customerIds = customers.map(c => c.id);
    let cards = [];
    let emails = [];
    let phones = [];
    
    if (customerIds.length > 0) {
      const placeholders = customerIds.map(() => '?').join(',');
      
      cards = db.prepare(`
        SELECT customerId, id, first6, last4, expirationDate, cardType
        FROM cards 
        WHERE customerId IN (${placeholders})
      `).all(...customerIds);
      
      emails = db.prepare(`
        SELECT customerId, id, emailAddress, primaryEmail
        FROM emailAddresses 
        WHERE customerId IN (${placeholders})
      `).all(...customerIds);
      
      phones = db.prepare(`
        SELECT customerId, id, phoneNumber
        FROM phoneNumbers 
        WHERE customerId IN (${placeholders})
      `).all(...customerIds);
    }

    // Group related data by customer
    const cardsByCustomer = cards.reduce((acc, card) => {
      if (!acc[card.customerId]) acc[card.customerId] = [];
      acc[card.customerId].push(card);
      return acc;
    }, {});
    
    const emailsByCustomer = emails.reduce((acc, email) => {
      if (!acc[email.customerId]) acc[email.customerId] = [];
      acc[email.customerId].push(email);
      return acc;
    }, {});
    
    const phonesByCustomer = phones.reduce((acc, phone) => {
      if (!acc[phone.customerId]) acc[phone.customerId] = [];
      acc[phone.customerId].push(phone);
      return acc;
    }, {});

    // Build customer response with card analysis
    const customersWithAnalysis = customers.map(customer => {
      const customerCards = cardsByCustomer[customer.id] || [];
      const customerEmails = emailsByCustomer[customer.id] || [];
      const customerPhones = phonesByCustomer[customer.id] || [];
      
      // Card expiration analysis
      const now = new Date();
      const cardAnalysis = customerCards.map(card => {
        if (!card.expirationDate) {
          return { card, status: 'no-expiration', daysUntil: 999999 };
        }
        
        // Parse MMYY format
        const month = parseInt(card.expirationDate.substring(0, 2));
        const year = 2000 + parseInt(card.expirationDate.substring(2, 4));
        const expDate = new Date(year, month - 1, 28);
        
        const daysDiff = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let status = 'valid';
        if (daysDiff < 0) status = 'expired';
        else if (daysDiff <= 30) status = 'expiring-soon';
        
        return { card, status, daysUntil: daysDiff };
      });
      
      const primaryEmail = customerEmails.find(e => e.primaryEmail)?.emailAddress || 
                          customerEmails[0]?.emailAddress;
      const primaryPhone = customerPhones[0]?.phoneNumber;
      
      return {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        businessName: customer.businessName,
        merchantId: customer.merchantId,
        merchantCurrency: customer.merchantCurrency,
        customerSince: customer.customerSince,
        marketingAllowed: customer.marketingAllowed,
        lastSyncedAt: customer.lastSyncedAt,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        emailAddresses: customerEmails,
        phoneNumbers: customerPhones,
        cards: cardAnalysis,
        hasExpired: cardAnalysis.some(c => c.status === 'expired'),
        hasExpiringSoon: cardAnalysis.some(c => c.status === 'expiring-soon'),
        totalCards: customerCards.length,
        primaryEmail,
        primaryPhone,
        metadata: {
          businessName: customer.businessName,
          note: customer.note,
          dobYear: customer.dobYear,
          dobMonth: customer.dobMonth,
          dobDay: customer.dobDay,
        }
      };
    });

    return Response.json({
      customers: customersWithAnalysis,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API customers error:', error);
    return Response.json(
      { error: 'Failed to fetch customers', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}