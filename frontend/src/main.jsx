import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import './styles/index.css';

// After a new deploy the file names change; a tab that was open before still asks for the old ones (404). Reload once to pick up the new version.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  if (sessionStorage.getItem('chunk-reload') !== '1') { sessionStorage.setItem('chunk-reload', '1'); window.location.reload(); }
});
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('chunk-reload'), 5000));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  </StrictMode>
);
