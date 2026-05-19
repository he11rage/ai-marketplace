import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Authorization from './pages/Authorization';
import Cart from './pages/Cart';
import ProductDetail from './pages/ProductDetail';
import Account from './pages/Account';
import Catalog from './pages/Catalog';
import CreateProduct from './pages/CreateProduct';
import Wishlist from './pages/Wishlist';
import AIChat from './pages/AIChat';
import CreateStore from './pages/CreateStore';
import StoreDetail from './pages/StoreDetail';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Authorization />} />
          <Route path="/signin" element={<Authorization />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/account" element={<Account />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/create-product" element={<CreateProduct />} />
          <Route path="/create-product/:id" element={<CreateProduct />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/create-store" element={<CreateStore />} />
          <Route path="/create-store/:id" element={<CreateStore />} />
          <Route path="/store/:id" element={<StoreDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;