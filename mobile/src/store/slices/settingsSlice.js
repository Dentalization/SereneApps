import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isDarkMode: false,
  language: 'id', // 'id' or 'en'
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
    },
    setTheme: (state, action) => {
      state.isDarkMode = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
  },
});

export const { toggleTheme, setTheme, setLanguage } = settingsSlice.actions;

export default settingsSlice.reducer;
