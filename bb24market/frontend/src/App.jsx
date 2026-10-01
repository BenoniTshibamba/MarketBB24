import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { Footer, Header } from "./components/ui";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SellerDashboard from "./pages/SellerDashboard";
import ProductForm from "./pages/ProductForm";
import Profile from "./pages/Profile";

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container page"><div className="empty"><div className="empty-emoji">⏳</div><p>Loading…</p></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="demo-strip">
          👋 Demo accounts (password for all: <code>demo123</code>) — buyer: <code>buyer@demo.com</code> · company seller: <code>seller@demo.com</code> · individual seller: <code>artisan@demo.com</code>
        </div>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Guard roles={["buyer", "seller"]}><Cart /></Guard>} />
          <Route path="/checkout" element={<Guard roles={["buyer", "seller"]}><Checkout /></Guard>} />
          <Route path="/order-success" element={<Guard roles={["buyer", "seller"]}><OrderSuccess /></Guard>} />
          <Route path="/orders" element={<Guard roles={["buyer", "seller"]}><Orders /></Guard>} />
          <Route path="/profile" element={<Guard roles={["buyer", "seller"]}><Profile /></Guard>} />
          <Route path="/seller" element={<Guard roles={["seller"]}><SellerDashboard /></Guard>} />
          <Route path="/seller/new" element={<Guard roles={["seller"]}><ProductForm /></Guard>} />
          <Route path="/seller/edit/:id" element={<Guard roles={["seller"]}><ProductForm /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}
