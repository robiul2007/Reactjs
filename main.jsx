import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// This grabs the empty box from the HTML and puts your App inside it
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
