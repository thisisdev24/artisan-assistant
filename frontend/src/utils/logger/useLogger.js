// src/utils/logger/useLogger.js
import { useLoggerClient } from "./loggerProvider.jsx";

export function useLogger() {
  const client = useLoggerClient();
  function logEvent(event) {
    client.logEvent(event);
  }
  return { logEvent };
}
