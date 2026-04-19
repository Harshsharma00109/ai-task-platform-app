import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1625',
              color: '#f3f4f6',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: '"DM Sans", sans-serif',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#1a1625' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1625' } },
          }}
        />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
