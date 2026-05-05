// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
	<BrowserRouter>
		<Suspense fallback={null}>
			<App />
		</Suspense>
	</BrowserRouter>
);
