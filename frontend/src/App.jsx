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
import AdminPanel from './pages/AdminPanel';
import AdminModerationLayout from './pages/AdminModerationLayout';
import AdminModerationProducts from './pages/AdminModerationProducts';
import AdminModerationStores from './pages/AdminModerationStores';
import AdminModerationOrders from './pages/AdminModerationOrders';
import AdminModerationReports from './pages/AdminModerationReports';
import AdminModerationUsers from './pages/AdminModerationUsers';
import AdminModerationAudit from './pages/AdminModerationAudit';
import AdminModerationAIHistory from './pages/AdminModerationAIHistory';
import AdminRoute from './components/AdminRoute';
import AuthRoute from './components/AuthRoute';
import SellerRoute from './components/SellerRoute';
import SellerCabinet from './pages/SellerCabinet';
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
          <Route path="/create-product" element={<SellerRoute><CreateProduct /></SellerRoute>} />
          <Route path="/create-product/:id" element={<SellerRoute><CreateProduct /></SellerRoute>} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin-panel" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/admin/moderation" element={<AdminRoute><AdminModerationLayout /></AdminRoute>}>
            <Route path="products" element={<AdminModerationProducts />} />
            <Route path="stores" element={<AdminModerationStores />} />
            <Route path="orders" element={<AdminModerationOrders />} />
            <Route path="reports" element={<AdminModerationReports />} />
            <Route path="users" element={<AdminModerationUsers />} />
            <Route path="audit" element={<AdminModerationAudit />} />
            <Route path="ai-history" element={<AdminModerationAIHistory />} />
          </Route>
          <Route path="/create-store" element={<SellerRoute><CreateStore /></SellerRoute>} />
          <Route path="/create-store/:id" element={<SellerRoute><CreateStore /></SellerRoute>} />
          <Route path="/seller" element={<SellerRoute><SellerCabinet /></SellerRoute>} />
          <Route path="/store/:id" element={<StoreDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
