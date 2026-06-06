import React, { createContext, useContext, useEffect, useState } from 'react';

type Role = 'admin' | 'operator';

type User = {
  email: string;
  role: Role;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => false,
  logout: () => {},
});

const STORAGE_KEY = 'cercotec_token';
const STORAGE_USER = 'cercotec_user';

const hardcodedUsers: Record<string, { password: string; role: Role }> = {
  'admin@cercotec.cl': { password: 'admin123', role: 'admin' },
  'operador@cercotec.cl': { password: 'op123', role: 'operator' },
};

function generateFakeJWT(user: User) {
  const payload = { email: user.email, role: user.role, iat: Date.now() };
  return btoa(JSON.stringify(payload));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem(STORAGE_KEY);
    const u = localStorage.getItem(STORAGE_USER);

    if (t && u) {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_USER);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    // support both operador and operador@cercotec.cl
    const userRecord = hardcodedUsers[normalized] ?? hardcodedUsers[email];
    if (userRecord && userRecord.password === password) {
      const u: User = { email: normalized, role: userRecord.role };
      const t = generateFakeJWT(u);
      localStorage.setItem(STORAGE_KEY, t);
      localStorage.setItem(STORAGE_USER, JSON.stringify(u));
      setToken(t);
      setUser(u);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_USER);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
