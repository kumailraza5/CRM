import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string) => void;
  register: (email: string, name: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("clienthunter_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [, setLocation] = useLocation();

  const getMockUsers = (): User[] => {
    const saved = localStorage.getItem("clienthunter_users");
    return saved ? JSON.parse(saved) : [];
  };

  const login = (email: string) => {
    const users = getMockUsers();
    const foundUser = users.find(u => u.email === email);
    
    // If user exists, use their details, otherwise use a default
    const userToLogin = foundUser || { id: "1", name: "Alex Developer", email };
    
    setUser(userToLogin);
    localStorage.setItem("clienthunter_user", JSON.stringify(userToLogin));
    setLocation("/dashboard");
  };

  const register = (email: string, name: string) => {
    const users = getMockUsers();
    const newUser = { id: Date.now().toString(), name, email };
    
    // Save to users list if not already there
    if (!users.find(u => u.email === email)) {
      users.push(newUser);
      localStorage.setItem("clienthunter_users", JSON.stringify(users));
    }
    
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
    <AuthContext.Provider value={{ user, login, register, logout }}>
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
