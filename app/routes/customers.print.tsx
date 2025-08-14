import type { Route } from "./+types/customers.print";
import { useLoaderData } from "react-router";
import { useEffect } from "react";
import { useLanguage, LanguageProvider } from "~/lib/language-context";

export function meta() {
  return [
    { title: "Customer Follow-up List - Clover Query" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'action-required';
  const searchTerm = url.searchParams.get('search') || '';
  const sortBy = url.searchParams.get('sort') || 'urgency';
  
  // Fetch all customers
  const apiUrl = new URL('/api/customers', request.url);
  apiUrl.searchParams.set('all', 'true');
  
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  return {
    ...data,
    filter,
    searchTerm,
    sortBy,
    printDate: new Date().toLocaleDateString(),
    printTime: new Date().toLocaleTimeString()
  };
}

// Format phone for easy reading
function formatPhone(phone: string) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// Format card number in standard credit card format with spacing
function formatCardNumber(first6: string, last4: string): string {
  if (!first6 || !last4) return '';
  
  // Standard format: XXXX XX** **** XXXX
  const firstFour = first6.substring(0, 4);
  const nextTwo = first6.substring(4, 6);
  
  return `${firstFour} ${nextTwo}** **** ${last4}`;
}

// Format expiry date from MMYY to MM/YY
function formatExpiry(expirationDate: string): string {
  if (!expirationDate || expirationDate.length !== 4) return '';
  
  const month = expirationDate.substring(0, 2);
  const year = expirationDate.substring(2, 4);
  
  return `${month}/${year}`;
}

// Get card status with card number and expiry details
function getCardStatus(customer: any, t: (key: string) => string) {
  const cards = customer.cards || [];
  const expiredCards = cards.filter((c: any) => c.status === 'expired');
  const expiringSoonCards = cards.filter((c: any) => c.status === 'expiring-soon');
  
  if (expiredCards.length > 0) {
    // Get the most recently expired card
    const mostRecent = expiredCards.reduce((recent, card) => 
      Math.abs(card.daysUntil) < Math.abs(recent.daysUntil) ? card : recent
    );
    const cardNumber = mostRecent.card?.first6 && mostRecent.card?.last4 ? 
      formatCardNumber(mostRecent.card.first6, mostRecent.card.last4) : '';
    const expiry = mostRecent.card?.expirationDate ? 
      formatExpiry(mostRecent.card.expirationDate) : '';
    const statusWithExpiry = expiry ? `${t('EXPIRED')} ${expiry}` : t('EXPIRED');
    return { 
      status: statusWithExpiry, 
      cardNumber, 
      expiry: '' 
    };
  }
  if (expiringSoonCards.length > 0) {
    // Get the card expiring soonest
    const soonest = expiringSoonCards.reduce((soon, card) => 
      card.daysUntil < soon.daysUntil ? card : soon
    );
    const cardNumber = soonest.card?.first6 && soonest.card?.last4 ? 
      formatCardNumber(soonest.card.first6, soonest.card.last4) : '';
    const expiry = soonest.card?.expirationDate ? 
      formatExpiry(soonest.card.expirationDate) : '';
    const statusWithExpiry = expiry ? `${t('EXPIRING')} ${expiry}` : t('EXPIRING');
    return { 
      status: statusWithExpiry, 
      cardNumber, 
      expiry: '' 
    };
  }
  if (cards.length === 0) {
    return { status: t('NO PAYMENT METHOD'), cardNumber: '', expiry: '' };
  }
  
  // For active/valid cards, show the earliest expiring one
  const activeCards = cards.filter((c: any) => c.status === 'valid' || c.status === 'active');
  if (activeCards.length > 0) {
    const earliest = activeCards.reduce((early, card) => 
      card.daysUntil < early.daysUntil ? card : early
    );
    const cardNumber = earliest.card?.first6 && earliest.card?.last4 ? 
      formatCardNumber(earliest.card.first6, earliest.card.last4) : '';
    const expiry = earliest.card?.expirationDate ? 
      formatExpiry(earliest.card.expirationDate) : '';
    const statusWithExpiry = expiry ? `${t('Active')} ${expiry}` : t('Active');
    return { 
      status: statusWithExpiry, 
      cardNumber, 
      expiry: '' 
    };
  }
  
  return { status: t('Active'), cardNumber: '', expiry: '' };
}

function CustomersPrintContent() {
  const data = useLoaderData<typeof loader>();
  const { t } = useLanguage();
  
  // Apply filters client-side
  let customers = data.customers;
  const now = Date.now();
  const cleanupDate = new Date('2025-07-21').getTime();
  const threeMonthsAgo = now - (90 * 24 * 60 * 60 * 1000);
  
  // Filter logic matching the main page
  if (data.filter === 'action-required') {
    customers = customers.filter((c: any) => {
      if (!c.businessName || c.businessName.trim() === '') return false;
      // Use same cleanup date logic as main page
      const hasCards = c.totalCards > 0;
      const isNewCustomer = c.customerSince && (
        hasCards ? c.customerSince >= threeMonthsAgo : c.customerSince >= cleanupDate
      );
      const hasExpiringSoon = c.hasExpiringSoon;
      let hasRecentlyExpired = false;
      if (c.cards) {
        hasRecentlyExpired = c.cards.some((card: any) => {
          if (card.status === 'expired') {
            const daysOverdue = Math.abs(card.daysUntil);
            return daysOverdue <= 180;
          }
          return false;
        });
      }
      return isNewCustomer || hasExpiringSoon || hasRecentlyExpired;
    });
  } else if (data.filter === 'expired') {
    customers = customers.filter((c: any) => c.hasExpired);
  } else if (data.filter === 'expiring') {
    customers = customers.filter((c: any) => c.hasExpiringSoon && !c.hasExpired);
  } else if (data.filter === 'no-cards') {
    customers = customers.filter((c: any) => c.totalCards === 0);
  }
  
  // Apply search
  if (data.searchTerm) {
    const search = data.searchTerm.toLowerCase();
    customers = customers.filter((customer: any) => {
      const name = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
      const business = (customer.businessName || '').toLowerCase();
      const email = (customer.primaryEmail || '').toLowerCase();
      const phone = (customer.primaryPhone || '').toLowerCase();
      return name.includes(search) || business.includes(search) || 
             email.includes(search) || phone.includes(search);
    });
  }
  
  // Apply sorting
  if (data.sortBy === 'urgency') {
    customers.sort((a: any, b: any) => {
      const getUrgency = (c: any) => {
        if (c.hasExpired) return 4;
        if (c.hasExpiringSoon) return 3;
        if (c.totalCards === 0) return 2;
        return 1;
      };
      return getUrgency(b) - getUrgency(a);
    });
  } else if (data.sortBy === 'name') {
    customers.sort((a: any, b: any) => {
      const nameA = (a.businessName || `${a.firstName} ${a.lastName}`).toLowerCase();
      const nameB = (b.businessName || `${b.firstName} ${b.lastName}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
  
  // Auto-trigger print dialog after page loads
  useEffect(() => {
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);
  
  return (
    <div className="print-container">
      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          table {
            font-size: 11pt;
          }
          
          .header {
            position: fixed;
            top: 0;
            width: 100%;
          }
          
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
          }
        }
        
        /* Screen styles for preview */
        @media screen {
          body {
            background: #e5e5e5;
          }
          
          .print-container {
            max-width: 8.5in;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            padding: 0.5in;
          }
        }
        
        /* Common styles */
        * {
          font-family: Arial, sans-serif;
        }
        
        h1 {
          font-size: 18pt;
          margin: 0 0 15px 0;
          color: #000;
        }
        
        .info-line {
          font-size: 10pt;
          color: #000;
          margin-bottom: 8px;
          font-weight: normal;
        }
        
        .info-line strong {
          font-weight: bold;
        }
        
        .header-section {
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 3px solid #000;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0;
        }
        
        th {
          background-color: #333;
          color: white;
          font-weight: bold;
          text-align: left;
          padding: 10px 8px;
          border-bottom: 2px solid #000;
          font-size: 11pt;
        }
        
        td {
          padding: 8px;
          border-bottom: 1px solid #999;
          font-size: 11pt;
          color: #000;
        }
        
        tr:nth-child(even) {
          background-color: #f0f0f0;
        }
        
        .status-expired {
          color: #dc2626;
          font-weight: bold;
        }
        
        .status-expiring {
          color: #ea580c;
          font-weight: bold;
        }
        
        .status-no-payment {
          color: #7c3aed;
          font-weight: bold;
        }
        
        .checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid #000;
          display: inline-block;
          vertical-align: middle;
        }
        
        .notes-section {
          border: 2px solid #000;
          height: 50px;
          margin-top: 8px;
          background-color: #fff;
        }
        
        .footer-info {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #000;
          font-size: 10pt;
          color: #000;
        }
        
        .footer-info strong {
          font-weight: bold;
        }
      `}</style>
      
      {/* Header */}
      <div className="header-section">
        <h1>{t('customer-followup-list')}</h1>
        <div className="info-line">
          <strong>{t('filter')}:</strong> {t(data.filter)} | 
          <strong>{t('total')}:</strong> {customers.length} {t('customers')} | 
          <strong>{t('printed')}:</strong> {data.printDate} à {data.printTime}
        </div>
        {data.searchTerm && (
          <div className="info-line">
            <strong>{t('search')}:</strong> "{data.searchTerm}"
          </div>
        )}
      </div>
      
      {/* Table */}
      <table>
        <thead>
          <tr>
            <th style={{ width: '30px' }}>✓</th>
            <th style={{ width: '40%' }}>{t('business-name')}</th>
            <th style={{ width: '35%' }}>{t('contact')}</th>
            <th style={{ width: '20%' }}>{t('card-status')}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer: any, index: number) => {
            const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || t('no-name');
            const cardStatus = getCardStatus(customer, t);
            const statusClass = cardStatus.status.includes(t('EXPIRED')) ? 'status-expired' : 
                               cardStatus.status.includes(t('EXPIRING')) ? 'status-expiring' : 
                               cardStatus.status.includes(t('NO PAYMENT METHOD')) ? 'status-no-payment' : '';
            
            return (
              <tr key={customer.id}>
                <td>
                  <div className="checkbox"></div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{customer.businessName || '—'}</strong>
                      {customer.businessName && name !== t('no-name') && (
                        <div style={{ fontSize: '10pt', color: '#333', marginTop: '2px' }}>{name}</div>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '9pt',
                      fontWeight: 'bold',
                      backgroundColor: customer.merchantCurrency === 'USD' ? '#1e40af' : '#059669',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      marginLeft: '8px',
                      flexShrink: 0
                    }}>
                      {customer.merchantCurrency}
                    </span>
                  </div>
                </td>
                <td>
                  {customer.primaryPhone && (
                    <div style={{ fontWeight: 'bold' }}>{formatPhone(customer.primaryPhone)}</div>
                  )}
                  {customer.primaryEmail && (
                    <div style={{ fontSize: '10pt', color: '#555', marginTop: '2px' }}>{customer.primaryEmail}</div>
                  )}
                  {!customer.primaryPhone && !customer.primaryEmail && '—'}
                </td>
                <td className={statusClass}>
                  <div style={{ fontWeight: 'bold' }}>{cardStatus.status}</div>
                  {cardStatus.cardNumber && (
                    <div style={{ fontSize: '10pt', marginTop: '2px' }}>{cardStatus.cardNumber}</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Notes Section */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '12pt', marginBottom: '10px' }}>{t('followup-notes')}:</h3>
        {[1, 2, 3].map(i => (
          <div key={i} className="notes-section"></div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="footer-info">
        <div>
          <strong>Instructions:</strong> {t('instructions')}
        </div>
        <div style={{ marginTop: '10px' }}>
          <strong>{t('staff-name')}:</strong> _________________________________ 
          <span style={{ marginLeft: '40px' }}><strong>{t('date')}:</strong> _____________</span>
        </div>
      </div>
      
      {/* Print, PDF, and Email buttons for screen view */}
      <div className="no-print" style={{ marginTop: '30px', textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '10px 20px',
            fontSize: '14pt',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          🖨️ {t('print-this-list')}
        </button>
        <button
          onClick={async (event) => {
            try {
              // Show loading state
              const button = event.target as HTMLButtonElement;
              const originalText = button.innerHTML;
              button.innerHTML = '⏳ Génération du PDF...';
              button.disabled = true;
              
              // Import PDF generation libraries
              const { default: jsPDF } = await import('jspdf');
              const { default: html2canvas } = await import('html2canvas');
              
              // Hide the buttons temporarily for PDF generation
              const buttonsDiv = document.querySelector('.no-print') as HTMLElement;
              if (buttonsDiv) {
                buttonsDiv.style.display = 'none';
              }
              
              // Generate canvas from the entire print container
              const printContainer = document.querySelector('.print-container') as HTMLElement;
              const canvas = await html2canvas(printContainer, {
                scale: 2, // Higher quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
              });
              
              // Show buttons again
              if (buttonsDiv) {
                buttonsDiv.style.display = 'flex';
              }
              
              // Create PDF
              const pdf = new jsPDF('portrait', 'mm', 'letter');
              const imgData = canvas.toDataURL('image/png');
              
              // Calculate dimensions to fit on page
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgWidth = pdfWidth - 20; // 10mm margin on each side
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              
              // Add image to PDF
              pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
              
              // Generate filename
              const timestamp = new Date().toISOString().split('T')[0];
              const filename = `Clover_Customers_${data.filter}_${timestamp}.pdf`;
              
              // Download the PDF
              pdf.save(filename);
              
              // Restore button
              button.innerHTML = originalText;
              button.disabled = false;
              
            } catch (error) {
              console.error('PDF download failed:', error);
              alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
              
              // Show buttons again if hidden
              const buttonsDiv = document.querySelector('.no-print') as HTMLElement;
              if (buttonsDiv) {
                buttonsDiv.style.display = 'flex';
              }
              
              // Restore button
              const button = event.target as HTMLButtonElement;
              button.innerHTML = '📄 ' + t('download-pdf');
              button.disabled = false;
            }
          }}
          style={{
            padding: '10px 20px',
            fontSize: '14pt',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          📄 {t('download-pdf')}
        </button>
        <button
          onClick={async (event) => {
            try {
              // Show loading state
              const button = event.target as HTMLButtonElement;
              const originalText = button.innerHTML;
              button.innerHTML = '📧 Envoi en cours...';
              button.disabled = true;

              // Create form data
              const formData = new FormData();
              formData.append('filter', data.filter);
              formData.append('search', data.searchTerm || '');
              formData.append('sort', data.sortBy || 'urgency');

              // Send email request
              const response = await fetch('/api/send-email', {
                method: 'POST',
                body: formData
              });

              const result = await response.json();

              if (response.ok) {
                alert(`✅ Rapport envoyé avec succès!\n\n${result.message}\n\nNombre de clients: ${result.customerCount}`);
              } else {
                throw new Error(result.details || result.error || 'Erreur inconnue');
              }

              // Restore button
              button.innerHTML = originalText;
              button.disabled = false;

            } catch (error) {
              console.error('Email sending failed:', error);
              alert(`❌ Erreur lors de l'envoi:\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}\n\nVérifiez la configuration dans .env`);

              // Restore button
              const button = event.target as HTMLButtonElement;
              button.innerHTML = '📧 ' + t('send-email');
              button.disabled = false;
            }
          }}
          style={{
            padding: '10px 20px',
            fontSize: '14pt',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          📧 {t('send-email')}
        </button>
      </div>
    </div>
  );
}

export default function CustomersPrint() {
  return (
    <LanguageProvider>
      <CustomersPrintContent />
    </LanguageProvider>
  );
}