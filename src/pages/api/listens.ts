import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { AppState, Action, User } from '@/types'; // ИСПРАВЛЕНО
import { USERS, UNITS, ONLINE_TESTS } from '@/constants'; // ИСПРАВЛЕНО

// --- Вставьте сюда ваши полные интерфейсы AppState, initialState, Action и appReducer ---
// (Убедитесь, что они здесь есть)

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastUpdateTime = useRef<number | null>(null);

    const reloadStateFromCloud = useCallback(async () => {
        try {
            const res = await fetch('/api/data', { cache: 'no-store' }); // Добавляем no-store для надежности
            const lastModified = res.headers.get('Last-Modified');
            const newUpdateTime = lastModified ? new Date(lastModified).getTime() : null;

            if (newUpdateTime && newUpdateTime !== lastUpdateTime.current) {
                console.log("New version on server detected! Reloading state...");
                lastUpdateTime.current = newUpdateTime;
                
                const data = await res.json();
                if (data.record) {
                    dispatch({ type: 'SET_INITIAL_STATE', payload: { ...data.record, isLoading: false } });
                }
            }
        } catch (error) {
            console.error("Failed to check for updates:", error);
        }
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (state.currentUser) {
                checkForUpdates();
            }
        }, 7000); // Увеличим интервал до 7 секунд

        return () => clearInterval(intervalId);
    }, [checkForUpdates, state.currentUser]);

    useEffect(() => {
        const loadInitialData = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const res = await fetch('/api/data');
                if (!res.ok) {
                    if (res.status === 404) {
                        dispatch({ type: 'SET_INITIAL_STATE', payload: { isLoading: false } });
                        return;
                    }
                    throw new Error('Failed to load initial data');
                }
                const data = await res.json();
                if (data.record) {
                    const lastModified = res.headers.get('Last-Modified');
                    lastUpdateTime.current = lastModified ? new Date(lastModified).getTime() : Date.now();
                    dispatch({ type: 'SET_INITIAL_STATE', payload: { ...data.record, isLoading: false } });
                }
            } catch (error) {
                console.error("CRITICAL: Failed to load initial state.", error);
                dispatch({ type: 'SET_ERROR', payload: 'Не удалось загрузить данные с сервера.' });
            }
        };
        loadInitialData();
    }, []);
    
    useEffect(() => {
        if (state.isLoading || !state.currentUser) {
            return;
        }
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            const stateToSave: Partial<AppState> = { ...state };
            // ... (удаление ненужных полей)

            fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave),
            }).catch(error => console.error("Error saving state:", error));
        }, 1500);

    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};