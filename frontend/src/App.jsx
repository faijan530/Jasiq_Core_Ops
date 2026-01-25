import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { BootstrapProvider } from './state/bootstrap.jsx';
import { AppRouter } from './routes/AppRouter.jsx';

export function App() {
  return (
    <BrowserRouter>
      <BootstrapProvider>
        <AppRouter />
      </BootstrapProvider>
    </BrowserRouter>
  );
}
