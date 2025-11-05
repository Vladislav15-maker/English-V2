import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Предполагая, что у вас есть App.tsx
import { AppProvider } from '@/context/AppContext'; // FIX: Используем псевдоним @
import '@/styles/globals.css';                 // FIX: Используем псевдоним @

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);