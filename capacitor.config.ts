import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kentaakakashi.ryu',
  appName: 'Ryu',
  webDir: 'dist',
  backgroundColor: '#10110f',
  android: { allowMixedContent: false },
};

export default config;