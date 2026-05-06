import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Authorization from './pages/Authorization';

export default function App() {
	return (
		<>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/login" element={<Authorization />} />
				<Route path="/registration" element={<Authorization />} />
			</Routes>
		</>
	);
}
