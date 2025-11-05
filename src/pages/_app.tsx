import type { AppProps } from 'next/app';
import { AppProvider } from '@/context/AppContext'; // <-- Используем новый псевдоним @
import '@/styles/globals.css';                 // <-- Используем новый псевдоним @

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Component {...pageProps} />
    </AppProvider>
  );
}

export default MyApp;