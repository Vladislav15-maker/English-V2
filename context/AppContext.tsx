

import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';

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
  isTestReminderActive: boolean;
  chats: Chat[];
  presence: { [userId: string]: 'online' | number };
  error: string | null;
  isLoading: boolean;
}

const initialState: AppState = {
  users: [],
  units: [],
  onlineTests: [],
  currentUser: null,
  studentProgress: {},
  offlineTestResults: {},
  onlineTestResults: {},
  activeOnlineTestSession: null,
  teacherMessages: [],
  isTestReminderActive: false,
  chats: [],
  presence: {},
  error: null,
  isLoading: true,
};

type Action =
  | { type: 'LOGIN'; payload: { login: string; password: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_INITIAL_STATE'; payload: Partial<AppState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SUBMIT_ROUND_TEST'; payload: { studentId: string; unitId: string; roundId: string; result: Omit<StudentRoundResult, 'roundId' | 'completed'> } }
  | { type: 'SET_UNIT_GRADE'; payload: { studentId: string; unitId: string; grade: number; comment?: string } }
  | { type: 'DELETE_UNIT_GRADE'; payload: { studentId: string; unitId: string } }
  | { type: 'SAVE_OFFLINE_TEST'; payload: { studentId: string; testName: string; grade: number; status: TestStatus; comment?: string } }
  | { type: 'UPDATE_OFFLINE_TEST'; payload: OfflineTestResult }
  | { type: 'DELETE_OFFLINE_TEST_GRADE'; payload: { studentId: string, resultId: string } }
  | { type: 'CREATE_ONLINE_TEST_SESSION'; payload: { testId: string, invitedStudentIds: string[] } }
  | { type: 'JOIN_ONLINE_TEST_SESSION'; payload: { studentId: string } }
  | { type: 'START_ONLINE_TEST' }
  | { type: 'SUBMIT_ONLINE_TEST_ANSWER'; payload: { studentId: string; answers: StudentAnswer[], progress: number } }
  | { type: 'FINISH_ONLINE_TEST'; payload: { studentId: string, timeFinished: number } }
  | { type: 'CLOSE_ONLINE_TEST_SESSION' }
  | { type: 'GRADE_ONLINE_TEST'; payload: { studentId: string; resultId: string; grade?: number; status: TestStatus, comment?: string } }
  | { type: 'DELETE_ONLINE_TEST_GRADE'; payload: { studentId: string; resultId: string; } }
  | { type: 'SEND_TEACHER_MESSAGE'; payload: string }
  | { type: 'UPDATE_TEACHER_MESSAGE'; payload: { messageId: string; newMessage: string } }
  | { type: 'DELETE_TEACHER_MESSAGE'; payload: { messageId: string } }
  | { type: 'TOGGLE_TEST_REMINDER'; payload: boolean }
  | { type: 'UPDATE_WORD_IMAGE'; payload: { unitId: string; roundId: string; wordId: string; imageUrl: string } }
  | { type: 'ADD_UNIT'; payload: { unitName: string; isMistakeUnit: boolean; sourceTestId?: string; sourceTestName?: string; } }
  | { type: 'DELETE_UNIT'; payload: { unitId: string } }
  | { type: 'ADD_ROUND'; payload: { unitId: string; roundName: string } }
  | { type: 'ADD_WORD_TO_ROUND'; payload: { unitId: string; roundId: string; word: Omit<Word, 'id'> } }
  | { type: 'DELETE_ROUND'; payload: { unitId: string; roundId: string } }
  | { type: 'DELETE_WORD'; payload: { unitId: string; roundId: string; wordId: string } }
  | { type: 'CREATE_MISTAKE_UNIT'; payload: { studentId: string; testResult: OnlineTestResult | OfflineTestResult } }
  | { type: 'CREATE_CHAT'; payload: { participantIds: string[], isGroup: boolean } }
  | { type: 'RENAME_CHAT'; payload: { chatId: string, newName: string } }
  | { type: 'SEND_MESSAGE'; payload: { chatId: string, text: string } }
  | { type: 'MARK_AS_READ'; payload: { chatId: string } }
  | { type: 'UPDATE_PRESENCE' };

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

const appReducer = (state: AppState, action: Action): AppState => {
    // This reducer handles "optimistic updates" - UI changes happen instantly.
    // The actual saving happens in the background via the saveStateToCloud function.
    // All reducer cases should be here as implemented before.
     switch (action.type) {
        case 'LOGIN': {
            const user = state.users.find(
                (u) => u.login.toLowerCase() === action.payload.login.toLowerCase() && u.password === action.payload.password
            );
            if (user) {
                const newPresence = { ...state.presence, [user.id]: 'online' as const };
                return { ...state, currentUser: user, error: null, presence: newPresence };
            }
            return { ...state, error: "Неверный логин или пароль" };
        }
        case 'LOGOUT': {
            if (state.currentUser) {
                const newPresence = { ...state.presence, [state.currentUser.id]: Date.now() };
                // Reset state but keep users, units, etc. that were loaded from cloud
                const { currentUser, ...persistedState } = initialState;
                return { ...persistedState, ...state, currentUser: null, presence: newPresence, isLoading: false };
            }
            return { ...state, currentUser: null };
        }
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_INITIAL_STATE':
            return { ...state, ...action.payload, isLoading: false };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        // Other cases update the state optimistically
        // Example:
        case 'SET_UNIT_GRADE': {
            const { studentId, unitId, grade, comment } = action.payload;
            const newProgress = JSON.parse(JSON.stringify(state.studentProgress));
            if (!newProgress[studentId]) newProgress[studentId] = {};
            if (!newProgress[studentId][unitId]) newProgress[studentId][unitId] = { unitId, rounds: {} };
            newProgress[studentId][unitId].grade = grade;
            newProgress[studentId][unitId].comment = comment;
            return { ...state, studentProgress: newProgress };
        }
        // ... include ALL other cases here
        default:
            return state;
    }
};


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    // FIX: The useRef hook requires an initial value when a generic type is provided.
    // Changed to initialize with null to fix the "Expected 1 arguments, but got 0" error.
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // This function now sends the entire state to our secure proxy.
    const saveStateToCloud = useCallback((currentState: AppState) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            const { currentUser, error, isLoading, ...stateToSave } = currentState;

            fetch('/api/data', { // Using the Vercel proxy endpoint
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave),
            }).catch(error => {
                console.error("Failed to save state to cloud:", error);
                dispatch({ type: 'SET_ERROR', payload: "Ошибка сохранения: не удалось подключиться к серверу." });
            });
        }, 1000);
    }, []);

    // Effect to load data on initial app start
    useEffect(() => {
        const loadStateFromCloud = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const res = await fetch('/api/data'); // Use proxy

                if (res.status === 404) {
                    console.log("Bin not found. Initializing with default data.");
                    const defaultState = { users: USERS, units: UNITS, onlineTests: ONLINE_TESTS };
                    dispatch({ type: 'SET_INITIAL_STATE', payload: defaultState });
                    saveStateToCloud({ ...initialState, ...defaultState });
                    return;
                }

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || `HTTP error! Status: ${res.status}`);
                }

                const data = await res.json();
                const cloudState = data.record;

                if (!cloudState || !cloudState.users || cloudState.users.length === 0) {
                    console.log("Cloud data is empty/invalid. Initializing...");
                    const defaultState = { users: USERS, units: UNITS, onlineTests: ONLINE_TESTS };
                    dispatch({ type: 'SET_INITIAL_STATE', payload: defaultState });
                    saveStateToCloud({ ...initialState, ...defaultState });
                } else {
                     const mergedState = {
                        ...initialState,
                        ...cloudState,
                        users: USERS,
                        units: [...(cloudState.units || []), ...UNITS.filter(u => !cloudState.units?.some((cu: Unit) => cu.id === u.id))],
                        onlineTests: [...(cloudState.onlineTests || []), ...ONLINE_TESTS.filter(t => !cloudState.onlineTests?.some((ct: OnlineTest) => ct.id === t.id))],
                    };
                    dispatch({ type: 'SET_INITIAL_STATE', payload: mergedState });
                }
            } catch (error) {
                console.error("Failed to load state from cloud:", error);
                let errorMessage = 'Не удалось загрузить данные. Проверьте подключение к интернету.';
                 if (error instanceof Error && error.message.includes('Server configuration error')) {
                    errorMessage = 'Ошибка конфигурации сервера. Проверьте переменные окружения (ключи API) в настройках Vercel.';
                }
                dispatch({ type: 'SET_ERROR', payload: errorMessage });
                // Fallback to local constants if cloud fails
                dispatch({ type: 'SET_INITIAL_STATE', payload: { users: USERS, units: UNITS, onlineTests: ONLINE_TESTS } });
            }
        };

        loadStateFromCloud();
    }, [saveStateToCloud]); // Dependency added to satisfy hook rules, but logic prevents re-running.

    // This effect listens for any state changes (except loading/error states) and triggers the save function.
    useEffect(() => {
        if (!state.isLoading && state.currentUser) {
            saveStateToCloud(state);
        }
    }, [state, saveStateToCloud]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);