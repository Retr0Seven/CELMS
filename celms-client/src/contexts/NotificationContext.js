import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

// Create the context
const NotificationContext = createContext();

/**
 * Provider component for notification management
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Add a new notification
  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const newNotification = { id, ...notification };

    setNotifications(prevNotifications => [
      ...prevNotifications,
      newNotification
    ]);

    // Also show a toast notification if specified
    if (notification.toast !== false) {
      const { type = 'info', message, description, duration = 5000 } = notification;

      toast[type](
        <div>
          <div className="fw-bold">{message}</div>
          {description && <div className="small">{description}</div>}
        </div>,
        { autoClose: duration }
      );
    }

    return id;
  }, []);

  // Remove a notification by ID
  const removeNotification = useCallback((id) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== id)
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods for different notification types
  const success = useCallback((message, description, options = {}) => {
    return addNotification({ type: 'success', message, description, ...options });
  }, [addNotification]);

  const error = useCallback((message, description, options = {}) => {
    return addNotification({ type: 'error', message, description, ...options });
  }, [addNotification]);

  const warning = useCallback((message, description, options = {}) => {
    return addNotification({ type: 'warning', message, description, ...options });
  }, [addNotification]);

  const info = useCallback((message, description, options = {}) => {
    return addNotification({ type: 'info', message, description, ...options });
  }, [addNotification]);

  // Create the context value
  const contextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook for using the notification context
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }

  return context;
};

export default NotificationContext;