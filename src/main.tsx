import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { LanguageProvider } from './localization'

// Disable context menu / long press popups globally, except inside chat bubbles, input elements, textareas, and comments.
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  // Check if the element or any of its ancestors is allowed (inputs, chats, or comments)
  const isAllowed = target.closest(
    'input, textarea, [contenteditable="true"], .allow-select, .chat-sent-bubble, .chat-received-bubble, .chat-message-bubble, .live-comment-item, .comments-container, .comments-modal, .group\\/comment'
  );

  if (!isAllowed) {
    e.preventDefault();
  }
}, { capture: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
)
