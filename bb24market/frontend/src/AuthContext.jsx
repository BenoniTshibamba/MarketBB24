import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = async () => {
    if (!getToken()) {
      setCartCount(0);
      return;
    }
    try {
      const cart = await api("/api/cart");
      setCartCount(cart.items.reduce((n, i) => n + i.qty, 0));
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const me = await api("/api/auth/me");
          setUser(me);
          await refreshCart();
        } catch {
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const res = await api("/api/auth/login", { method: "POST", body: { email, password } });
    setToken(res.token);
    setUser(res.user);
    await refreshCart();
    return res.user;
  };

  const register = async (payload) => {
    const res = await api("/api/auth/register", { method: "POST", body: payload });
    setToken(res.token);
    setUser(res.user);
    await refreshCart();
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCartCount(0);
  };

  const refreshUser = async () => {
    const me = await api("/api/auth/me");
    setUser(me);
    return me;
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, cartCount, refreshCart, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
