import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Импортируем LoginView вместо App. Убедитесь, что у вас есть этот файл.
// Если главный компонент называется иначе, укажите его имя.
import LoginView from '@/components/LoginView'; 
import { AppProvider } from '@/context/AppContext';
import '@/styles/globals.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AppProvider>
      {/* FIX: Отображаем LoginView как главный компонент */}
      <LoginView />
    </AppProvider>
  </React.StrictMode>
);