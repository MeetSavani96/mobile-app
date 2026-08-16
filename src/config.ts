import { Capacitor } from '@capacitor/core';

// Global configuration for the AKV Energy Mobile Application

export const APP_CONFIG = {
  appName: 'AKV Energy',
  version: '1.0.0',

  // ─── API Endpoint ────────────────────────────────────────────────────────
  apiEndpoint: (() => {
    // 1. Android Emulator or Native device running via Capacitor
    if (Capacitor.isNativePlatform()) {
      return (
        import.meta.env.VITE_ANDROID_API_URL ||
        'http://10.0.2.2:8888/mobile-app/php/api.php'
      );
    }

    // 2. Explicit environment variable set in Vite .env for web
    if (import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }

    const origin = window.location.origin;
    const isLocalDev =
      origin.includes('127.0.0.1') ||
      origin.includes('localhost');

    // 3. Local browser web development fallback
    if (isLocalDev) {
      return 'http://localhost:8888/mobile-app/php/api.php';
    }

    // 4. Production fallback
    return 'https://akvenergy.com/mobile-app/php/api.php';
  })(),

  get apiBase(): string {
    return this.apiEndpoint.replace('/api.php', '');
  },

  // ─── Contact & Brand ─────────────────────────────────────────────────────
  websiteUrl: 'https://akvenergy.com/',
  supportPhone: '+91 95376 61151',
  supportEmail: 'info@akvenergy.com',
  whatsappNumber: '919537661151',
  instagramUrl: 'https://www.instagram.com/akvenergysolutions/',
  logoUrl: 'https://kommodo.ai/i/m7YPxR9HWGMIlmT461sC',

  // ─── Office Address ───────────────────────────────────────────────────────
  officeAddress: '1st Floor, Nagnath Society, Plot No: 1/A, Near The Avalon Business Hub, Aamba Talavadi, Priya Park Society, Katargam, Surat, Gujarat - 395004, India',
  officeAddressShort: 'Katargam, Surat, Gujarat - 395004',
  googleMapsQuery: '1st+Floor+Nagnath+Society+Plot+No+1A+Near+The+Avalon+Business+Hub+Aamba+Talavadi+Katargam+Surat+Gujarat+395004',

  // ─── Solar Calculation Defaults ──────────────────────────────────────────
  defaultTariffRate: 8.0,
  defaultState: 'Gujarat',

  // ─── Indian States ────────────────────────────────────────────────────────
  states: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
  ]
};
