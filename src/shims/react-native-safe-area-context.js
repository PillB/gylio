// Web shim for react-native-safe-area-context
// SafeAreaView is not needed on the web platform.
import React from 'react';

export const SafeAreaProvider = ({ children }) => children;
export const SafeAreaView = ({ children, style }) =>
  React.createElement('div', { style }, children);
export const SafeAreaInsetsContext = React.createContext({ top: 0, right: 0, bottom: 0, left: 0 });
export const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 0, height: 0 });
export const initialWindowMetrics = null;
