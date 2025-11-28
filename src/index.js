import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// initialise i18n before rendering any components
import './i18n/i18n.js';

// Render the application at the #root element defined in index.html.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);