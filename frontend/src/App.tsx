import { BrowserRouter, useRoutes } from 'react-router-dom';
import { CustomThemeProvider } from './app/ThemeContext';
import { appRoutes } from './app/routes';
import { AuthIdentityProvider } from './features/auth-identity';

function AppRoutes() {
  return useRoutes(appRoutes);
}

function App() {
  return (
    <CustomThemeProvider>
      <AuthIdentityProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthIdentityProvider>
    </CustomThemeProvider>
  );
}

export default App;
