import { Routes, Route } from 'react-router-dom';
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
import Admin from './pages/Admin';
import AdminRoute from './components/AdminRoute';
import AuthRoute from './components/AuthRoute';
import NotFound from './pages/NotFound';

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
          <Route path="/create-product" element={<AuthRoute><CreateProduct /></AuthRoute>} />
          <Route path="/create-product/:id" element={<AuthRoute><CreateProduct /></AuthRoute>} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/create-store" element={<AuthRoute><CreateStore /></AuthRoute>} />
          <Route path="/create-store/:id" element={<AuthRoute><CreateStore /></AuthRoute>} />
          <Route path="/store/:id" element={<StoreDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
