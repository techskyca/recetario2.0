// Punto de entrada de la interfaz React de Recetario Ultraseco 2.0
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/variables.css';
import './styles/main.css';
import './styles/print.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

