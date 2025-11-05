import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// ... (Интерфейс AppState, initialState, тип Action и appReducer остаются без изменений. Вставьте сюда ваш полный код для них)
// ВАЖНО: Убедитесь, что в appReducer у вас НЕТ действия SEND_MESSAGE, так как теперь данные сохраняются и отправляются через saveStateToCloud

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
        console.log("Real-time update received from Supabase! Reloading state...");
        try {
            const res = await fetch('/api/data');
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to fetch data: ${errorText}`);
            };
            const data = await res.json();
            
            // Проверяем, что в ответе есть record, иначе это может быть HTML страница
            if (!data.record) {
                throw new Error("Invalid data format received from API");
            }

            const cloudState = data.record;
            
            dispatch({ type: 'SET_INITIAL_STATE', payload: { ...cloudState, isLoading: false } });

        } catch (error) {
            console.error("Failed to reload state for real-time update:", error);
        }
    }, []);

    useEffect(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.warn("Supabase keys are not defined. Real-time updates will be disabled.");
            return;
        }

        let client: SupabaseClient | null = null;
        let channel: RealtimeChannel | null = null;
        try {
            client = createClient(supabaseUrl, supabaseKey);
            channel = client.channel('main-channel');

            channel
              .on(
                'broadcast',
                { event: 'state-updated' },
                () => {
                  reloadStateFromCloud();
                }
              )
              .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                  console.log('Successfully subscribed to Supabase channel!');
                }
                if (status === 'CHANNEL_ERROR') {
                  console.error('Supabase channel error:', err);
                }
              });
            
            return () => {
              if (client && channel) {
                client.removeChannel(channel);
              }
            };
        } catch (error) {
            console.error("Failed to initialize Supabase. Real-time will be disabled.", error);
        }
    }, [reloadStateFromCloud]);

    const saveStateToCloud = useCallback(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        if (!latestState.current.currentUser) return;
        
        debounceTimer.current = setTimeout(() => {
            const stateToSave = { ...latestState.current };
            delete (stateToSave as Partial<AppState>).currentUser;
            delete (stateToSave as Partial<AppState>).error;
            delete (stateToSave as Partial<AppState>).isLoading;
            delete (stateToSave as Partial<AppState>).users;
            delete (stateToSave as Partial<AppState>).units;
            delete (stateToSave as Partial<AppState>).onlineTests;

            // Теперь эта функция просто сохраняет данные. API /api/data сам отправит real-time сигнал.
            fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave),
            })
            .catch(error => {
                console.error("Failed to save state:", error);
                dispatch({ type: 'SET_ERROR', payload: "Ошибка сохранения." });
            });
        }, 1500);
    }, []);
    
    // ... (useEffect для loadStateFromCloud и saveStateToCloud без изменений) ...
};

export const useAppContext = () => useContext(AppContext);