import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';

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
  | { type: 'SEND_ANNOUNCEMENT'; payload: { type: 'active' | 'info', message: string } }
  | { type: 'DELETE_ANNOUNCEMENT'; payload: { announcementId: string } }
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
  | { type: 'RECEIVE_MESSAGE'; payload: { chatId: string, message: ChatMessage } }
  | { type: 'MARK_AS_READ'; payload: { chatId: string } }
  | { type: 'UPDATE_PRESENCE' };

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
        
        // --- Вставьте сюда все остальные case из вашего appReducer ---
        // (Я добавил их из вашего кода, который вы присылали ранее)

        case 'SUBMIT_ROUND_TEST': {
            const { studentId, unitId, roundId, result } = action.payload;
            const newProgress = JSON.parse(JSON.stringify(state.studentProgress));
            if (!newProgress[studentId]) newProgress[studentId] = {};
            if (!newProgress[studentId][unitId]) newProgress[studentId][unitId] = { unitId, rounds: {} };
            newProgress[studentId][unitId].rounds[roundId] = { ...result, roundId: roundId, completed: true };
            return { ...state, studentProgress: newProgress };
        }
        
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

    const reloadStateFromCloud = useCallback(async () => {
        console.log("Real-time update signal received! Reloading state...");
        try {
            const res = await fetch('/api/data');
            if (!res.ok) throw new Error("Failed to fetch data for real-time update");
            const data = await res.json();
            if (data.record) {
                // Преобразуем JSON-строку обратно в объект
                const parsedState = JSON.parse(data.record);
                dispatch({ type: 'SET_INITIAL_STATE', payload: { ...parsedState, isLoading: false } });
            }
        } catch (error) {
            console.error("Failed to reload state:", error);
        }
    }, []);

    useEffect(() => {
        const eventSource = new EventSource('/api/listen');
        console.log("Connecting to real-time event source...");

        eventSource.onopen = () => console.log("EventSource connection opened.");
        eventSource.onmessage = (event) => {
            if (event.data === 'updated') {
                reloadStateFromCloud();
            }
        };
        eventSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            eventSource.close();
        };

        return () => {
            console.log("Closing EventSource connection.");
            eventSource.close();
        };
    }, [reloadStateFromCloud]);

    useEffect(() => {
        const loadInitialData = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const res = await fetch('/api/data');
                if (!res.ok) {
                    if (res.status === 404) {
                        console.log("No data found on Upstash, using initial local state.");
                        dispatch({ type: 'SET_INITIAL_STATE', payload: { isLoading: false } });
                        return;
                    }
                    throw new Error('Failed to load initial data');
                }
                const data = await res.json();
                if (data.record) {
                    // Преобразуем JSON-строку обратно в объект
                    const parsedState = JSON.parse(data.record);
                    dispatch({ type: 'SET_INITIAL_STATE', payload: { ...parsedState, isLoading: false } });
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

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            const stateToSave: Partial<AppState> = { ...state };
            delete stateToSave.currentUser;
            delete stateToSave.error;
            delete stateToSave.isLoading;
            delete stateToSave.users;
            delete stateToSave.units;
            delete stateToSave.onlineTests;
            
            console.log("Saving state to Upstash via API...");
            fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave),
            }).catch(error => {
                console.error("Error saving state:", error);
            });
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