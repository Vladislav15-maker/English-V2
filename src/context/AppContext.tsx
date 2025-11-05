import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';
import { db, auth } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

// Интерфейс состояния
interface AppState {
  users: User[];
  units: Unit[];
  onlineTests: OnlineTest[];
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
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
  firebaseUser: null,
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
  | { type: 'SET_FIREBASE_USER'; payload: FirebaseUser | null }
  | { type: 'SET_INITIAL_STATE'; payload: Partial<AppState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  // ... и все остальные ваши типы действий
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

const appReducer = (state: AppState, action: Action): AppState => {
    // ... (Вставьте сюда ВЕСЬ ваш appReducer без изменений)
};

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSaving = useRef(false);
    const hasLoadedInitialData = useRef(false);

    useEffect(() => {
        dispatch({ type: 'SET_LOADING', payload: true });

        const unsubAuth = onAuthStateChanged(auth, user => {
            if (user) {
                console.log("Firebase user is signed in with UID:", user.uid);
                dispatch({ type: 'SET_FIREBASE_USER', payload: user });
                
                const docRef = doc(db, "appData", "state");
                const unsubDb = onSnapshot(docRef, (docSnap) => {
                    if (!hasLoadedInitialData.current) {
                        console.log("Initial data loaded from Firestore.");
                    } else {
                        console.log("Real-time update from Firestore received!");
                    }
                    
                    if (docSnap.exists()) {
                        const cloudState = docSnap.data();
                        dispatch({ type: 'SET_INITIAL_STATE', payload: { ...cloudState, isLoading: false } });
                    } else {
                        console.log("No data in Firestore, using initial state.");
                        dispatch({ type: 'SET_INITIAL_STATE', payload: { isLoading: false } });
                    }
                    hasLoadedInitialData.current = true;
                }, (error) => {
                    console.error("Firestore snapshot error:", error);
                    dispatch({ type: 'SET_ERROR', payload: "Ошибка подключения к базе данных." });
                });
                return () => unsubDb();

            } else {
                console.log("No user signed in, signing in anonymously...");
                signInAnonymously(auth).catch(error => {
                    console.error("Anonymous sign-in error:", error);
                    dispatch({ type: 'SET_ERROR', payload: "Ошибка анонимной аутентификации." });
                });
            }
        });

        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!hasLoadedInitialData.current || isSaving.current || state.isLoading || !state.firebaseUser) {
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            isSaving.current = true;
            const stateToSave: Partial<AppState> = { ...state };
            delete stateToSave.currentUser;
            delete stateToSave.firebaseUser;
            delete stateToSave.error;
            delete stateToSave.isLoading;
            delete stateToSave.users;
            delete stateToSave.units;
            delete stateToSave.onlineTests;
            
            console.log("Saving state to Firestore...");
            setDoc(doc(db, "appData", "state"), stateToSave, { merge: true })
                .then(() => console.log("State successfully saved."))
                .catch(error => console.error("Error saving state to Firestore:", error))
                .finally(() => {
                    setTimeout(() => { isSaving.current = false; }, 500);
                });
        }, 2000);

    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);