import React, { createContext, useContext, useMemo, useState } from 'react';

type NotificationType = 'success' | 'error' | 'info';

type Notification = {
  id: number;
  type: NotificationType;
  message: string;
};

type NotificationContextType = {
  notifications: Notification[];
  notify: (type: NotificationType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = (id: number) =>
    setNotifications(current => current.filter(item => item.id !== id));

  const notify = (type: NotificationType, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotifications(current => [...current, { id, type, message }]);
    window.setTimeout(() => dismiss(id), 3500);
  };

  const value = useMemo(
    () => ({
      notifications,
      notify,
      success: (message: string) => notify('success', message),
      error: (message: string) => notify('error', message),
      info: (message: string) => notify('info', message),
      dismiss,
    }),
    [notifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider');
  }
  return context;
};
