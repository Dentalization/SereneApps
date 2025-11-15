import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  history: [], // Array of AI diagnosis results
  currentAnalysis: null,
  isAnalyzing: false,
  error: null,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    startAnalysis: (state) => {
      state.isAnalyzing = true;
      state.error = null;
    },
    analysisSuccess: (state, action) => {
      const result = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };

      state.currentAnalysis = result;
      state.history.unshift(result);
      state.isAnalyzing = false;
      state.error = null;

      // Keep only last 50 results
      if (state.history.length > 50) {
        state.history = state.history.slice(0, 50);
      }
    },
    analysisFailure: (state, action) => {
      state.isAnalyzing = false;
      state.error = action.payload;
    },
    clearCurrentAnalysis: (state) => {
      state.currentAnalysis = null;
    },
    deleteHistoryItem: (state, action) => {
      state.history = state.history.filter(
        (item) => item.id !== action.payload
      );
    },
    clearHistory: (state) => {
      state.history = [];
    },
    loadHistory: (state, action) => {
      state.history = action.payload;
    },
  },
});

export const {
  startAnalysis,
  analysisSuccess,
  analysisFailure,
  clearCurrentAnalysis,
  deleteHistoryItem,
  clearHistory,
  loadHistory,
} = aiSlice.actions;

export default aiSlice.reducer;
