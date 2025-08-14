import type { Route } from "./+types/home";
import { Link } from "react-router";
import { useLanguage, LanguageSelector } from "~/lib/language-context";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Clover Query - Credit Card Expiration Monitor" },
    { name: "description", content: "Monitor customer credit card expiration dates across multiple Clover merchant accounts" },
  ];
}

export default function Home() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="flex justify-end mb-4">
            <LanguageSelector />
          </div>
          
          <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Clover Query</h1>
          <p className="text-gray-600 mb-6">{t('monitor-description')}</p>
          
          <div className="space-y-4">
            <Link 
              to="/dashboard"
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors duration-200 font-medium inline-block"
            >
              {t('view-dashboard')}
            </Link>
            
            <Link 
              to="/customers"
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200 font-medium inline-block"
            >
              {t('view-customers')}
            </Link>
            
            <div className="text-sm text-gray-500">
              <p className="mb-2">{t('features')}:</p>
              <ul className="text-left space-y-1">
                <li>• {t('multi-merchant-support')}</li>
                <li>• {t('realtime-tracking')}</li>
                <li>• {t('customer-contact-info')}</li>
                <li>• {t('export-notifications')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
