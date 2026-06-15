import { BrowserRouter, useRoutes } from 'react-router-dom';
import { CustomThemeProvider } from './app/ThemeContext';
import { appRoutes } from './app/routes';
import { AuthIdentityProvider } from './features/auth-identity';
import { MarketScopeProvider } from './contexts/MarketScopeContext';

function AppRoutes() {
  return useRoutes(appRoutes);
}

function App() {
  return (
    <CustomThemeProvider>
      <MarketScopeProvider>
        <AuthIdentityProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AppRoutes />
          </BrowserRouter>
        </AuthIdentityProvider>
      </MarketScopeProvider>
    </CustomThemeProvider>
  );
}

export default App;
