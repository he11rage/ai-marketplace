import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Authorization from './pages/Authorization';
import Cart from './pages/Cart';

export default function App() {
	return (
		<>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/cart" element={<Cart />} />
				<Route path="/login" element={<Authorization />} />
				<Route path="/registration" element={<Authorization />} />
			</Routes>
		</>
	);
}
