import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './routes/AppRouter';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';

import './index.css'; // if you want global styles

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <AppRouter />
    </ThemeProvider>
  </React.StrictMode>
);
