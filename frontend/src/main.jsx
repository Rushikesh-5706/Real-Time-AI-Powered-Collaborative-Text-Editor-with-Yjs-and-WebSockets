import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Assign a stable username for this session
const storedUser = sessionStorage.getItem('collab-username');
const username = storedUser || `User${Math.floor(Math.random() * 9000) + 1000}`;
if (!storedUser) {
  sessionStorage.setItem('collab-username', username);
}

createRoot(document.getElementById('root')).render(
  <App username={username} />
);
