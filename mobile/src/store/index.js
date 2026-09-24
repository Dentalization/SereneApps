import { configureStore, combineReducers } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

import authReducer, { logout, tokenRefreshed } from './slices/authSlice';
import { configureAuthSessionHandlers } from '../services/authSessionEvents';
import cartReducer from './slices/cartSlice';
import aiReducer from './slices/aiSlice';
import settingsReducer from './slices/settingsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  ai: aiReducer,
  settings: settingsReducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'cart', 'ai', 'settings'], // Persist all slices
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
configureAuthSessionHandlers({
  expired: () => store.dispatch(logout()),
  refreshed: (token) => store.dispatch(tokenRefreshed(token)),
});
