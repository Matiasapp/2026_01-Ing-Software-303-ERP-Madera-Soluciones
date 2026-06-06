import React, { createContext, useContext, useState } from 'react';

type GlobalState = {
  company: string;
  setCompany: (name: string) => void;
};

const defaultState: GlobalState = {
  company: 'Cercotec',
  setCompany: () => {},
};

const GlobalContext = createContext<GlobalState>(defaultState);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<string>('Cercotec');

  return (
    <GlobalContext.Provider value={{ company, setCompany }}>{children}</GlobalContext.Provider>
  );
};

export const useGlobal = () => useContext(GlobalContext);

export default GlobalContext;
