import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth';
import { LanguageProvider } from './i18n';
import { ToastProvider } from './toast';
import Landing from './pages/Landing';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <Routes>
              <Route path="*" element={<Landing />} />
            </Routes>
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
