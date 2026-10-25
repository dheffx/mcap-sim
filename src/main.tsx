import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './ui/styles.css';
import { App } from './ui/App';

const root = document.getElementById('root');
if (!root) throw new Error('The application root is missing.');
createRoot(root).render(<StrictMode><App /></StrictMode>);
