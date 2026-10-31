import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App';
import './index.css';
import './ryu-redesign.css';

// Keep Android's status bar outside the WebView so app content never sits beneath system icons.
if (Capacitor.isNativePlatform()) {
  void StatusBar.setOverlaysWebView({ overlay: false });
  void StatusBar.setBackgroundColor({ color: '#080d09' });
  void StatusBar.setStyle({ style: Style.Light });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
