
import { useEffect, useState } from "react";
import { AuthContext } from "./auth-context";
import api from "../services/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem("aquaroute_token"))
  );

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("aquaroute_token");

    if (!token) {
      return () => {
        cancelled = true;
      };
    }

    async function loadUser() {
      try {
        const response = await api.get("/me");

        if (!cancelled) {
          setUser(response.data.user);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem("aquaroute_token");
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const response = await api.post("/login", {
      email,
      password,
    });

    localStorage.setItem("aquaroute_token", response.data.token);
    setUser(response.data.user);

    return response.data.user;
  }

  async function register(name, email, password, password_confirmation) {
    const response = await api.post("/register", {
      name,
      email,
      password,
      password_confirmation,
    });

    localStorage.setItem("aquaroute_token", response.data.token);
    setUser(response.data.user);

    return response.data.user;
  }

  async function logout() {
    try {
      if (localStorage.getItem("aquaroute_token")) {
        await api.post("/logout");
      }
    } finally {
      localStorage.removeItem("aquaroute_token");
      setUser(null);
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
