import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import './index.css';
import App from './App.jsx';

const accessToken = localStorage.getItem('accessToken');
if (accessToken) {
	axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

createRoot(document.getElementById('root')).render(
	<BrowserRouter>
		<Suspense fallback={null}>
			<App />
		</Suspense>
	</BrowserRouter>
);
