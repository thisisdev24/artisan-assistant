// src/utils/logger/loggerProvider.jsx
import React, { createContext, useContext, useMemo } from "react";
import { initLogger } from "./initLogger.js";

const LoggerContext = createContext(null);

export function LoggerProvider({ children, options }) {
  const client = useMemo(() => initLogger(options), []);
  return <LoggerContext.Provider value={client}>{children}</LoggerContext.Provider>;
}

export function useLoggerClient() {
  return useContext(LoggerContext);
}
