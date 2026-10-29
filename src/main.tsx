import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// AbortError benign (fetch/listen dibatalkan saat unmount, ganti query, ganti
// akun) tidak boleh mencemari console sebagai "Uncaught (in promise)".
// Error asli (permission-denied, dsb) tetap tampil normal.
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason as { name?: string; message?: string } | null | undefined;
  if (
    r &&
    typeof r === 'object' &&
    (r.name === 'AbortError' ||
      (typeof r.message === 'string' && r.message.includes('signal is aborted')))
  ) {
    e.preventDefault();
    console.debug('[abort] benign, disembunyikan:', r.message);
  }
});

createRoot(document.getElementById('root')!).render(<App />);
