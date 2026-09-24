// Avoid importing the Redux store into the HTTP client (which would create a cycle).
let handlers = {};
export const configureAuthSessionHandlers = (next) => { handlers = next; };
export const notifySessionExpired = () => handlers.expired?.();
export const notifyTokenRefreshed = (accessToken) => handlers.refreshed?.(accessToken);
