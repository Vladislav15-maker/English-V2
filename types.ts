export enum UserRole {
  Teacher = 'TEACHER',
  Student = 'STUDENT',
}

export interface User {
  id: string;
  name: string;
  login: string;
  password: string;
  role: UserRole;
}

export interface Word {
  id: string;
  english: string;
  russian: string;
  transcription: string;
  image: string;
  alternatives?: string[];
}

export interface Round {
  id: string;
  name: string;
  words: Word[];
}

export interface Unit {
  id: string;
  name: string;
  rounds: Round[];
  isMistakeUnit?: boolean;
  sourceTestId?: string;
  sourceTestName?: string;
}

export enum StageType {
  Writing = 'WRITING',
  ChoiceText = 'CHOICE_TEXT',
  ChoiceImage = 'CHOICE_IMAGE',
}

export interface StageAnswer {
  wordId: string;
  studentAnswer: string; // For Writing and ChoiceText, this is the typed answer or the selected russian word. For ChoiceImage, this is the selected image URL.
  correct: boolean;
  question: string; // The word shown to the student (e.g., the Russian word in Writing stage)
  correctAnswer: string; // The correct English word
}

export interface StageResult {
  type: StageType;
  answers: StageAnswer[];
  score: number; // Percentage 0-100
}


export interface StudentRoundResult {
  roundId: string;
  overallScore: number; // Percentage 0-100
  stages: {
    [key in StageType]?: StageResult;
  };
  completed: boolean;
}

export interface StudentUnitProgress {
  unitId: string;
  grade?: number;
  comment?: string;
  rounds: { [roundId: string]: StudentRoundResult };
}

export enum TestStatus {
  Passed = 'PASSED',
  Failed = 'FAILED',
}

export interface OfflineTestResult {
  id: string;
  studentId: string;
  testName: string;
  grade?: number;
  status?: TestStatus;
  timestamp: number;
  comment?: string;
}

export interface OnlineTest {
  id: string;
  name: string;
  words: Word[];
  durationMinutes: number;
}

export interface StudentAnswer {
  wordId: string;
  studentAnswer: string;
  correct: boolean;
}

export interface OnlineTestSessionStudent {
  studentId: string;
  name: string;
  progress: number;
  answers: StudentAnswer[];
  timeFinished?: number;
}
export interface OnlineTestSession {
  id: string;
  testId: string;
  teacherId: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  students: { [studentId: string]: OnlineTestSessionStudent };
  startTime?: number;
  invitedStudentIds: string[];
}
export interface OnlineTestResult {
    id: string;
    studentId: string;
    testId: string;
    score: number;
    answers: StudentAnswer[];
    timeTaken: number;
    grade?: number;
    status?: TestStatus;
    timestamp: number;
    comment?: string;
}

export interface TeacherMessage {
  id: string;
  message: string;
  timestamp: number;
  isEditing?: boolean;
}

// --- NEW CHAT TYPES ---
export interface ChatParticipant {
    userId: string;
    name: string;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: number;
}

export interface Chat {
    id: string;
    name?: string; // Optional custom name for group chats
    participants: ChatParticipant[];
    messages: ChatMessage[];
    isGroup: boolean;
    lastRead: { [userId: string]: number }; // timestamp of last read message
}