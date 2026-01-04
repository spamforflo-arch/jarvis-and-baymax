import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cc0837b0d5e84c95925d8673170b80f5',
  appName: 'Warm AI',
  webDir: 'dist',
  server: {
    url: 'https://cc0837b0-d5e8-4c95-925d-8673170b80f5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0d1117',
      showSpinner: false
    }
  }
};

export default config;
