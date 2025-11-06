import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement } from '@/types'; // ИСПОЛЬЗУЕМ @
import { USERS, UNITS, ONLINE_TESTS } from '@/constants'; // ИСПОЛЬЗУЕМ @
// Интерфейс состояния
interface AppState {
users: User[];
units: Unit[];
onlineTests: OnlineTest[];
currentUser: User | null;
studentProgress: { [studentId: string]: { [unitId:string]: StudentUnitProgress } };
offlineTestResults: { [studentId: string]: OfflineTestResult[] };
onlineTestResults: {[studentId: string]: OnlineTestResult[]};
activeOnlineTestSession: OnlineTestSession | null;
teacherMessages: TeacherMessage[];
announcements: Announcement[];
chats: Chat[];
presence: { [userId: string]: 'online' | number };
error: string | null;
isLoading: boolean;
}
// Начальное состояние
const initialState: AppState = {
users: USERS,
units: UNITS,
onlineTests: ONLINE_TESTS,
currentUser: null,
studentProgress: {},
offlineTestResults: {},
onlineTestResults: {},
activeOnlineTestSession: null,
teacherMessages: [],
announcements: [],
chats: [],
presence: {},
error: null,
isLoading: true,
};
// Типы действий
type Action =
| { type: 'LOGIN_SUCCESS'; payload: User }
| { type: 'LOGOUT' }
| { type: 'SET_INITIAL_STATE'; payload: Partial<AppState> }
| { type: 'SET_LOADING'; payload: boolean }
| { type: 'SET_ERROR'; payload: string | null }
| { type: 'SUBMIT_ROUND_TEST'; payload: { studentId: string; unitId: string; roundId: string; result: Omit<StudentRoundResult, 'roundId' | 'completed'> } }
// ... (остальные типы Action)
;
// Полный Reducer
const appReducer = (state: AppState, action: Action): AppState => {
switch (action.type) {
case 'LOGIN_SUCCESS':
return { ...state, currentUser: action.payload, error: null };
case 'LOGOUT':
return { ...state, currentUser: null };
case 'SET_LOADING':
return { ...state, isLoading: action.payload };
case 'SET_INITIAL_STATE':
return {
...initialState,
...action.payload,
currentUser: state.currentUser,
isLoading: false
};
case 'SET_ERROR':
return { ...state, error: action.payload, isLoading: false };
case 'SUBMIT_ROUND_TEST': {
        const { studentId, unitId, roundId, result } = action.payload;
        const newProgress = JSON.parse(JSON.stringify(state.studentProgress));
        if (!newProgress[studentId]) newProgress[studentId] = {};
        if (!newProgress[studentId][unitId]) newProgress[studentId][unitId] = { unitId, rounds: {} };
        newProgress[studentId][unitId].rounds[roundId] = { ...result, roundId: roundId, completed: true };
        return { ...state, studentProgress: newProgress };
    }
    
    // ... (вставьте сюда остальные ваши case'ы, если они есть)

    default:
        return state;
}
};
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
        const res = await fetch('/api/data', { cache: 'no-store' });
        const lastModified = res.headers.get('Last-Modified');
        const newUpdateTime = lastModified ? new Date(lastModified).getTime() : null;

        if (newUpdateTime && newUpdateTime > (lastUpdateTime.current || 0)) {
            console.log("New data detected, reloading...");
            lastUpdateTime.current = newUpdateTime;
            
            const data = await res.json();
            if (data.record) {
                dispatch({ type: 'SET_INITIAL_STATE', payload: { ...JSON.parse(data.record), isLoading: false } });
            }
        }
    } catch (error) {
        console.error("Failed to check for updates:", error);
    }
}, []);

useEffect(() => {
    const intervalId = setInterval(() => {
        if (state.currentUser) {
            reloadStateFromCloud();
        }
    }, 7000);

    return () => clearInterval(intervalId);
}, [reloadStateFromCloud, state.currentUser]);

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
                dispatch({ type: 'SET_INITIAL_STATE', payload: { ...JSON.parse(data.record), isLoading: false } });
            }
        } catch (error) {
            console.error("CRITICAL: Failed to load initial state.", error);
            dispatch({ type: 'SET_ERROR', payload: 'Не удалось загрузить данные с сервера.' });
        }
    };
    loadInitialData();
}, []);

useEffect(() => {
    if (state.isLoading || !state.currentUser) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
        const stateToSave: Partial<AppState> = { ...state };
        delete stateToSave.currentUser;
        delete stateToSave.error;
        delete stateToSave.isLoading;
        delete stateToSave.users;
        delete stateToSave.units;
        delete stateToSave.onlineTests;

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