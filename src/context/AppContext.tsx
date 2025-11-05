import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// ... (Your AppState, initialState, Action, and appReducer code should be here. It does not need to change)

// --- PASTE YOUR FULL `AppState`, `initialState`, `Action`, and `appReducer` HERE ---

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    
    const latestState = useRef(state);
    useEffect(() => {
        latestState.current = state;
    }, [state]);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reloadStateFromCloud = useCallback(async () => {
        // ... (This function remains unchanged)
    }, []);

    useEffect(() => {
        // NEXT_PUBLIC_ variables work automatically in Next.js
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.warn("Supabase keys are not defined. Real-time updates will be disabled.");
            return;
        }

        // ... (The rest of the Supabase connection logic remains unchanged)
    }, [reloadStateFromCloud]);

    const saveStateToCloud = useCallback(() => {
        // ... (This function remains unchanged)
    }, []);

    useEffect(() => {
        const loadStateFromCloud = async () => {
            // ... (This function remains unchanged)
        };

        loadStateFromCloud();
    }, []);

    useEffect(() => {
        if (!state.isLoading && state.currentUser) {
            saveStateToCloud();
        }
    }, [state, saveStateToCloud]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);