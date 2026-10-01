import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'

// Apply the saved color theme before first paint (avoids a flash)
try {
  const saved = localStorage.getItem('bb24market_theme');
  document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

// Keep emojis consistent on every device (Twemoji). Re-parse when React
// updates the DOM; if the CDN is unreachable we simply keep native emojis.
function watchEmojis() {
  if (!window.twemoji) return;
  window.twemoji.parse(document.body);
  let t = null;
  const mo = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => { try { window.twemoji.parse(document.body); } catch {} }, 60);
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

watchEmojis();
