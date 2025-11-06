import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { User, UserRole, TestStatus, OnlineTestSession, OnlineTest, StudentUnitProgress, StudentRoundResult, OnlineTestSessionStudent, OfflineTestResult, Unit, Word, Round, TeacherMessage, StageType, StageResult, OnlineTestResult, Chat, ChatMessage, Announcement } from '@/types';
import Modal from '@/components/common/Modal';
import { CheckCircleIcon, XCircleIcon, ClockIcon, UsersIcon, ChartBarIcon, DocumentTextIcon, MegaphoneIcon, EyeIcon, ClipboardDocumentListIcon, PencilIcon, BookOpenIcon, TrashIcon, PlusIcon, UploadIcon, ArchiveBoxIcon, PlusCircleIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, UserGroupIcon, CheckIcon, ChevronLeftIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@/components/common/Icons';

type TeacherViewMode = 'dashboard' | 'student_detail' | 'offline_grader' | 'online_test_manager' | 'online_test_monitor' | 'online_test_history' | 'online_test_results' | 'content_editor' | 'chat';

// Под-компоненты вынесены за пределы TeacherView, что правильно

const WordItemEditor: React.FC<{ word: Word; unitId: string; roundId: string, onConfirm: (message: string, onConfirm: () => void) => void }> = ({ word, unitId, roundId, onConfirm }) => {
    const { dispatch } = useAppContext();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'saved' | 'error' | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState(word.image);

    useEffect(() => {
        setCurrentImageUrl(word.image);
    }, [word.image]);
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            setUploadStatus(null);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const data = await response.json();
                const imageUrl = data.secure_url;
                
                setCurrentImageUrl(imageUrl);
                dispatch({ type: 'UPDATE_WORD_IMAGE', payload: { unitId, roundId, wordId: word.id, imageUrl }});
                setUploadStatus('saved');
            } catch (error) {
                console.error("Failed to upload image:", error);
                setUploadStatus('error');
            } finally {
                setIsUploading(false);
                 setTimeout(() => setUploadStatus(null), 3000);
            }
        }
    };
    
    const handleDeleteWord = () => {
        onConfirm(`Вы уверены, что хотите удалить слово "${word.english}"?`, () => {
            dispatch({ type: 'DELETE_WORD', payload: { unitId, roundId, wordId: word.id }});
        });
    };

    const getButtonText = () => {
        if(isUploading) return "Загрузка...";
        if(uploadStatus === 'saved') return "Сохранено!";
        if(uploadStatus === 'error') return "Ошибка!";
        return "Загрузить новую картинку";
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center gap-4">
            <img 
                src={currentImageUrl || 'https://via.placeholder.com/400x300?text=No+Image'} 
                alt={word.english} 
                className="w-full sm:w-40 h-32 object-contain rounded-md bg-slate-100 flex-shrink-0"
            />
            <div className="flex-grow w-full">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg">{word.english} / {word.russian}</h4>
                    <button onClick={handleDeleteWord} className="text-red-500 hover:text-red-700">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <label htmlFor={`file-upload-${word.id}`} className="flex-grow cursor-pointer w-full">
                        <div className={`w-full text-center px-4 py-2 rounded-lg text-white font-semibold transition 
                            ${isUploading ? 'bg-slate-400' : ''} 
                            ${uploadStatus === 'saved' ? 'bg-green-500' : ''} 
                            ${uploadStatus === 'error' ? 'bg-red-500' : ''}
                            ${!isUploading && !uploadStatus ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                        `}>
                           {getButtonText()}
                        </div>
                    </label>
                    <input id={`file-upload-${word.id}`} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading}/>
                </div>
            </div>
        </div>
    );
};

const AddWordForm: React.FC<{ unitId: string, roundId: string }> = ({ unitId, roundId }) => {
    const { dispatch } = useAppContext();
    const [english, setEnglish] = useState('');
    const [russian, setRussian] = useState('');
    const [transcription, setTranscription] = useState('');
    const [image, setImage] = useState('');
    const [imageName, setImageName] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageName('Загрузка...');
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await fetch('/api/upload-image', { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Upload failed');
                const data = await response.json();
                setImage(data.secure_url);
                setImageName(file.name);
            } catch (error) {
                console.error("Failed to upload image:", error);
                setImageName('Ошибка загрузки');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleAddWord = (e: React.FormEvent) => {
        e.preventDefault();
        if(!english || !russian || !transcription || !image) {
            alert("Пожалуйста, заполните все поля и загрузите картинку.");
            return;
        }
        dispatch({ type: 'ADD_WORD_TO_ROUND', payload: { unitId, roundId, word: { english, russian, transcription, image } } });
        setEnglish('');
        setRussian('');
        setTranscription('');
        setImage('');
        setImageName('');
    };

    return (
        <form onSubmit={handleAddWord} className="bg-slate-50 p-4 rounded-lg mt-6 border-dashed border-2 border-slate-300">
            <h4 className="font-bold text-lg mb-4">Добавить новое слово</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={english} onChange={e => setEnglish(e.target.value)} placeholder="English" className="p-2 border rounded-lg" required/>
                <input value={russian} onChange={e => setRussian(e.target.value)} placeholder="Русский" className="p-2 border rounded-lg" required/>
                <input value={transcription} onChange={e => setTranscription(e.target.value)} placeholder="Транскрипция" className="p-2 border rounded-lg" required/>
                <div>
                     <label htmlFor={`new-word-image-upload`} className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg bg-white">
                        <UploadIcon className="w-5 h-5 text-indigo-600"/>
                        <span className="text-slate-500 truncate">{imageName || 'Выберите картинку'}</span>
                    </label>
                    <input id={`new-word-image-upload`} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} required disabled={isUploading}/>
                </div>
            </div>
            <button type="submit" className="mt-4 px-4 py-2 rounded-lg text-white font-semibold bg-green-600 hover:bg-green-700 flex items-center gap-2 disabled:bg-slate-400" disabled={isUploading}>
                <PlusIcon className="w-5 h-5"/> Добавить слово
            </button>
        </form>
    );
}

// ... и другие под-компоненты, если они есть

const TeacherView: React.FC = () => {
    // Все хуки вызываются здесь, в самом начале - ЭТО ПРАВИЛЬНО
    const { state, dispatch } = useAppContext();
    const { currentUser, users, studentProgress, offlineTestResults, activeOnlineTestSession, onlineTests, onlineTestResults, announcements, teacherMessages } = state;
    const [view, setView] = useState<TeacherViewMode>('dashboard');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [editingTest, setEditingTest] = useState<OfflineTestResult | null>(null);
    const [offlineStudentId, setOfflineStudentId] = useState<string>('');
    const [offlineTestName, setOfflineTestName] = useState<string>('');
    const [offlineGrade, setOfflineGrade] = useState<number>(5);
    const [offlineStatus, setOfflineStatus] = useState<TestStatus>(TestStatus.Passed);
    const [offlineComment, setOfflineComment] = useState('');
    const [selectedOnlineTest, setSelectedOnlineTest] = useState<OnlineTest | null>(null);
    const [selectedStudentsForTest, setSelectedStudentsForTest] = useState<string[]>([]);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [editingRound, setEditingRound] = useState<Round | null>(null);
    const [newUnitName, setNewUnitName] = useState('');
    const [isNewUnitMistake, setIsNewUnitMistake] = useState(false);
    const [newUnitSourceTestId, setNewUnitSourceTestId] = useState('');
    const [newRoundName, setNewRoundName] = useState('');
    const [message, setMessage] = useState('');
    const [showMessageHistory, setShowMessageHistory] = useState(false);
    const [announcementType, setAnnouncementType] = useState<'active' | 'info'>('info');
    const [announcementMessage, setAnnouncementMessage] = useState('');
    const [reviewingRoundResult, setReviewingRoundResult] = useState<StudentRoundResult | null>(null);
    const [gradeInput, setGradeInput] = useState<{ [id: string]: string }>({});
    const [commentInput, setCommentInput] = useState<{ [id: string]: string }>({});
    type GradeState = { grade: string; status: TestStatus; comment: string };
    const [historyGradeState, setHistoryGradeState] = useState<{ [resultId: string]: GradeState }>({});
    const [selectedResult, setSelectedResult] = useState<OnlineTestResult | null>(null);
    const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void } | null>(null);

    // ... (весь остальной код компонента, который я предоставлял ранее, должен быть здесь)

    // Пример функции, чтобы было понятно, где должен быть остальной код
    const onConfirm = (message: string, callback: () => void) => {
        setConfirmation({ message, onConfirm: callback });
    };

    // ... и так далее
    
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:p-8 py-8">
            {/* ... JSX вашего компонента ... */}
        </div>
    );
};

export default TeacherView;