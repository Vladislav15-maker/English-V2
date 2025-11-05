import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';
import Pusher from 'pusher-js';

// Интерфейс состояния не меняется
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
  announcements: [],
  chats: [],
  presence: {},
  error: null,
  isLoading: true,
};

// FIX: Добавляем новый тип действия для получения сообщения в реальном времени
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
  | { type: 'RECEIVE_MESSAGE'; payload: { chatId: string, message: ChatMessage } } // <-- НОВОЕ ДЕЙСТВИЕ
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
    switch (action.type) {
        // ... (Все case до SEND_MESSAGE без изменений)

        case 'SEND_MESSAGE': {
            if (!state.currentUser) return state;
            const newMessage: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random()}`, // Добавим немного случайности для уникальности
                senderId: state.currentUser.id,
                text: action.payload.text,
                timestamp: Date.now()
            };

            // Мгновенно отправляем сообщение через API для real-time доставки
            fetch('/api/chat-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: action.payload.chatId, message: newMessage }),
            });

            // Обновляем локальное состояние отправителя
            return {
                ...state,
                chats: state.chats.map(chat => chat.id === action.payload.chatId ? {
                    ...chat,
                    messages: [...chat.messages, newMessage],
                    lastRead: { ...chat.lastRead, [state.currentUser!.id]: newMessage.timestamp }
                } : chat)
            };
        }

        // FIX: НОВЫЙ ОБРАБОТЧИК для входящих сообщений
        case 'RECEIVE_MESSAGE': {
            const { chatId, message } = action.payload;

            // Не добавляем сообщение, если оно уже есть (предотвращаем дублирование у отправителя)
            const chatExists = state.chats.find(c => c.id === chatId);
            if (chatExists && chatExists.messages.some(m => m.id === message.id)) {
                return state;
            }

            return {
                ...state,
                chats: state.chats.map(chat => {
                    if (chat.id === chatId) {
                        return {
                            ...chat,
                            messages: [...chat.messages, message]
                        };
                    }
                    return chat;
                })
            };
        }

        case 'MARK_AS_READ': {
            // ... (этот case без изменений)
        }
        
        // ... (все остальные case без изменений)
    }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    
    const latestState = useRef(state);
    useEffect(() => {
        latestState.current = state;
    }, [state]);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reloadStateFromCloud = useCallback(async (isTriggeredByChat = false) => {
        // Если обновление вызвано чатом, мы его игнорируем, т.к. чат обновляется сам
        if (isTriggeredByChat) return;

        console.log("Real-time update received! Reloading state...");
        try {
            const res = await fetch('/api/data');
            if (!res.ok) return;
            const data = await res.json();
            const cloudState = data.record;
            
            dispatch({ type: 'SET_INITIAL_STATE', payload: { ...cloudState, isLoading: false } });
        } catch (error) {
            console.error("Failed to reload state for real-time update:", error);
        }
    }, []);

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
            console.warn("Pusher keys are not defined. Real-time updates will be disabled.");
            return;
        }

        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        });

        const channel = pusher.subscribe('main-channel');

        // Слушаем ОБЩЕЕ обновление состояния (для всего, кроме чата)
        channel.bind('state-updated', () => {
            reloadStateFromCloud();
        });

        // FIX: Слушаем НОВОЕ событие специально для сообщений чата
        channel.bind('new-message', (data: { chatId: string, message: ChatMessage }) => {
            console.log("New chat message received:", data);
            // Получив сообщение, диспатчим новое действие, чтобы добавить его в локальный стейт
            dispatch({ type: 'RECEIVE_MESSAGE', payload: data });
        });

        return () => {
            pusher.unsubscribe('main-channel');
            pusher.disconnect();
        };
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

            fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave),
            })
            .then(res => {
                if(res.ok) {
                    // Отправляем общий сигнал об обновлении. Чат его проигнорирует, а все остальное обновится.
                    console.log("State saved, triggering general real-time update...");
                    fetch('/api/trigger-update', { method: 'POST' });
                } else {
                     throw new Error('Failed to save state');
                }
            })
            .catch(error => {
                console.error("Failed to save state and trigger update:", error);
                dispatch({ type: 'SET_ERROR', payload: "Ошибка сохранения: не удалось подключиться к серверу." });
            });
        }, 1500);
    }, []);
    
    // ... (useEffect для loadStateFromCloud и saveStateToCloud без изменений)

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);