import type { AppProps } from 'next/app';
import { AppProvider } from '@/context/AppContext'; // FIX: Используем псевдоним @
import '@/styles/globals.css';                 // FIX: Используем псевдоним @

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Component {...pageProps} />
    </AppProvider>
  );
}

export default MyApp;