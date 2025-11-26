// src/utils/logger/loggerProvider.jsx
/* eslint-disable react-refresh/only-export-components */


import React, { createContext, useContext, useEffect } from "react";
import { createLoggerClient } from "./loggerClient";
import { initFrontendLogging } from "./initLogger";

const LoggerContext = createContext(null);

export function LoggerProvider({ children }) {
  const client = createLoggerClient();

  // safe: this is inside a component & after Provider exists
  useEffect(() => {
    initFrontendLogging(client);
  }, [client]);

  return (
    <LoggerContext.Provider value={client}>
      {children}
    </LoggerContext.Provider>
  );
}

export function useLoggerClient() {
  return useContext(LoggerContext);
}
