import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("clienthunter_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [, setLocation] = useLocation();

  const login = (email: string, name = "Admin") => {
    const newUser = { id: "1", name, email };
    setUser(newUser);
    localStorage.setItem("clienthunter_user", JSON.stringify(newUser));
    setLocation("/dashboard");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("clienthunter_user");
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
