import { BrowserRouter, useRoutes } from 'react-router-dom';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { appRoutes } from './app/routes';

function AppRoutes() {
  return useRoutes(appRoutes);
}

function App() {
  return (
    <CustomThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </CustomThemeProvider>
  );
}

export default App;
