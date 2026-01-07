import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveAIAnalysis } from '../../services/aiAnalysisSyncService';

// Async thunk to save analysis to backend
export const syncAnalysisToBackend = createAsyncThunk(
  'ai/syncToBackend',
  async (analysisResult, { rejectWithValue }) => {
    try {
      const response = await saveAIAnalysis(analysisResult);
      return response;
    } catch (error) {
      // Don't fail the whole analysis if sync fails
      console.warn('Failed to sync AI analysis to backend:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  history: [], // Array of AI diagnosis results
  currentAnalysis: null,
  isAnalyzing: false,
  isSyncing: false,
  error: null,
  syncError: null,
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
    clearSyncError: (state) => {
      state.syncError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncAnalysisToBackend.pending, (state) => {
        state.isSyncing = true;
        state.syncError = null;
      })
      .addCase(syncAnalysisToBackend.fulfilled, (state) => {
        state.isSyncing = false;
        state.syncError = null;
      })
      .addCase(syncAnalysisToBackend.rejected, (state, action) => {
        state.isSyncing = false;
        state.syncError = action.payload;
      });
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
  clearSyncError,
} = aiSlice.actions;

export default aiSlice.reducer;
