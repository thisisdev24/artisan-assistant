// src/utils/logger/useLogger.js
import { useContext } from "react";
import { LoggerContext } from "./loggerProvider.jsx"; // adjust export if needed

export function useLogger() {
  const client = useContext(LoggerContext);
  if (!client) throw new Error("LoggerProvider is missing");
  return {
    logEvent: (e) => client.logEvent(e),
    flush: (u) => client.flush(u),
    setUser: (u) => client.setUser(u),
  };
}
