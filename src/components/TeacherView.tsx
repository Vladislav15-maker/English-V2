import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { User, UserRole, TestStatus, OnlineTestSession, OnlineTest, StudentUnitProgress, StudentRoundResult, OnlineTestSessionStudent, OfflineTestResult, Unit, Word, Round, TeacherMessage, StageType, StageResult, OnlineTestResult, Chat, ChatMessage, Announcement } from '@/types';
import Modal from '@/components/common/Modal';
import { CheckCircleIcon, XCircleIcon, ClockIcon, UsersIcon, ChartBarIcon, DocumentTextIcon, MegaphoneIcon, EyeIcon, ClipboardDocumentListIcon, PencilIcon, BookOpenIcon, TrashIcon, PlusIcon, UploadIcon, ArchiveBoxIcon, PlusCircleIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, UserGroupIcon, CheckIcon, ChevronLeftIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@/components/common/Icons';

// ... (весь остальной код компонента)
export type TeacherViewMode =
  | 'dashboard'
  | 'students'
  | 'student_detail'
  | 'tests'
  | 'results'
  | 'announcements'
  | 'messages'
  | 'online_test_history'
  | 'online_test_monitor'
  | 'offline_grader'
  | 'online_test_manager'
  | 'content_editor'
  | 'chat'
  | 'online_test_results'; // ← добавлено

const [view, setView] = useState<TeacherViewMode>('dashboard');
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

const AnswerReviewModal: React.FC<{
    roundResult: StudentRoundResult;
    onClose: () => void;
}> = ({ roundResult, onClose }) => {
    const [activeTab, setActiveTab] = useState<StageType>(StageType.Writing);
    
    const renderStageDetails = (stageResult: StageResult) => (
        <div className="space-y-3">
            {stageResult.answers.map((answer, index) => (
                <div key={index} className={`p-3 rounded-lg ${answer.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="font-semibold text-slate-800">Вопрос: <span className="font-bold">{answer.question}</span></p>
                    <p className="text-sm text-slate-600">Ответ ученика: <span className={`font-medium ${answer.correct ? 'text-green-700' : 'text-red-700'}`}>{answer.studentAnswer}</span></p>
                    {!answer.correct && <p className="text-sm text-slate-600">Правильный ответ: <span className="font-medium text-slate-800">{answer.correctAnswer}</span></p>}
                </div>
            ))}
        </div>
    );

    return (
        <Modal isVisible={true} onClose={onClose} title={`Детальный разбор раунда`}>
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {Object.keys(roundResult.stages).map((stageType) => (
                        <button
                            key={stageType}
                            onClick={() => setActiveTab(stageType as StageType)}
                            className={`${
                                activeTab === stageType
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                        >
                           { { [StageType.Writing]: 'Правописание', [StageType.ChoiceText]: 'Выбор слова', [StageType.ChoiceImage]: 'Выбор картинки' }[stageType as StageType] }
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-4 max-h-80 overflow-y-auto">
                {roundResult.stages[activeTab] ? renderStageDetails(roundResult.stages[activeTab]!) : <p>Нет данных для этого этапа.</p>}
            </div>
        </Modal>
    );
};

const ChatInterface: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { state, dispatch } = useAppContext();
    const { currentUser, users, chats, presence } = state;
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [readReceiptsInfo, setReadReceiptsInfo] = useState<ChatMessage | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newChatName, setNewChatName] = useState("");
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const userChats = useMemo(() =>
        chats.filter(c => c.participants.some(p => p.userId === currentUser?.id))
            .sort((a, b) => {
                const lastMsgA = a.messages[a.messages.length - 1]?.timestamp || 0;
                const lastMsgB = b.messages[b.messages.length - 1]?.timestamp || 0;
                return lastMsgB - lastMsgA;
            }),
        [chats, currentUser]
    );

    const selectedChat = useMemo(() => userChats.find(c => c.id === selectedChatId), [userChats, selectedChatId]);

    useEffect(() => {
        if (selectedChatId) {
            dispatch({ type: 'MARK_AS_READ', payload: { chatId: selectedChatId } });
        }
    }, [selectedChatId, dispatch, selectedChat?.messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedChat?.messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && selectedChatId) {
            dispatch({ type: 'SEND_MESSAGE', payload: { chatId: selectedChatId, text: newMessage } });
            setNewMessage('');
        }
    };

    const getChatName = (chat: Chat) => {
        if (chat.isGroup && chat.name) return chat.name;
        if (chat.isGroup) return chat.participants.filter(p => p.userId !== currentUser?.id).map(p => p.name).join(', ');
        const otherUser = chat.participants.find(p => p.userId !== currentUser?.id);
        return otherUser?.name || 'Unknown User';
    };
    
    const getPresenceStatus = (userId: string) => {
        const status = presence[userId];
        if (status === 'online') return 'online';
        if (typeof status === 'number') {
            const minutesAgo = Math.round((Date.now() - status) / 60000);
            if (minutesAgo < 1) return 'только что';
            if (minutesAgo < 60) return `${minutesAgo}м назад`;
            const hoursAgo = Math.floor(minutesAgo / 60);
            if (hoursAgo < 24) return `${hoursAgo}ч назад`;
            return `давно`;
        }
        return 'оффлайн';
    };

    const getOtherParticipantPresence = (chat: Chat) => {
        if(chat.isGroup) return null;
        const otherUser = chat.participants.find(p => p.userId !== currentUser?.id);
        return otherUser ? getPresenceStatus(otherUser.userId) : null;
    }

    const handleRenameChat = () => {
        if (newChatName.trim() && selectedChatId) {
            dispatch({ type: 'RENAME_CHAT', payload: { chatId: selectedChatId, newName: newChatName }});
            setIsRenaming(false);
            setNewChatName("");
        }
    }

    const NewChatModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
        const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
        const otherUsers = users.filter(u => u.id !== currentUser!.id);

        const handleCreateChat = () => {
            if(selectedUserIds.length > 0) {
                dispatch({ type: 'CREATE_CHAT', payload: { participantIds: selectedUserIds, isGroup: selectedUserIds.length > 1 }});
                onClose();
            }
        }

        return (
            <Modal isVisible={true} onClose={onClose} title="Создать новый чат">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {otherUsers.map(user => (
                        <label key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedUserIds.includes(user.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedUserIds(prev => [...prev, user.id]);
                                    } else {
                                        setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                                    }
                                }}
                            />
                            {user.name}
                        </label>
                    ))}
                </div>
                <button onClick={handleCreateChat} className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400" disabled={selectedUserIds.length === 0}>
                    Начать чат
                </button>
            </Modal>
        )
    }


    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in flex flex-col h-[calc(100vh-128px)]">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium">
                    <ChevronLeftIcon className="w-5 h-5" /> Назад
                </button>
                <h2 className="text-2xl font-bold">Чат</h2>
                {currentUser?.role === 'TEACHER' &&
                    <button onClick={() => setShowNewChatModal(true)} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-indigo-700">Новый чат</button>
                }
            </div>

            {showNewChatModal && <NewChatModal onClose={() => setShowNewChatModal(false)} />}
            
            {selectedChat && showParticipantsModal && (
                <Modal isVisible={true} onClose={() => setShowParticipantsModal(false)} title="Участники чата">
                    <ul className="space-y-3">
                        {selectedChat.participants.map(p => (
                            <li key={p.userId} className="flex justify-between items-center">
                                <span>{p.name}</span>
                                <span className="text-sm text-slate-500">{getPresenceStatus(p.userId)}</span>
                            </li>
                        ))}
                    </ul>
                </Modal>
            )}

            {readReceiptsInfo && selectedChat && (
                 <Modal isVisible={true} onClose={() => setReadReceiptsInfo(null)} title="Прочитали сообщение">
                    <ul className="space-y-2">
                        {selectedChat.participants
                            .filter(p => p.userId !== currentUser!.id && (selectedChat.lastRead[p.userId] || 0) >= readReceiptsInfo.timestamp)
                            .map(p => (
                                <li key={p.userId} className="flex justify-between items-center">
                                    <span>{p.name}</span>
                                    <span className="text-sm text-slate-400">{new Date(selectedChat.lastRead[p.userId]).toLocaleString()}</span>
                                </li>
                            ))}
                    </ul>
                </Modal>
            )}

            <div className="flex-grow flex border border-slate-200 rounded-lg shadow-md overflow-hidden">
                <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col">
                    <div className="p-2 border-b border-slate-200">
                         <h3 className="font-semibold text-lg text-slate-700 px-2">Чаты</h3>
                    </div>
                    <ul className="overflow-y-auto flex-grow">
                        {userChats.map(chat => {
                            const lastMessage = chat.messages[chat.messages.length - 1];
                            const hasUnread = lastMessage && (!chat.lastRead[currentUser!.id] || chat.lastRead[currentUser!.id] < lastMessage.timestamp);
                            const otherParticipantPresence = getOtherParticipantPresence(chat);
                            return (
                            <li key={chat.id}>
                                <button onClick={() => setSelectedChatId(chat.id)} className={`w-full text-left p-3 hover:bg-indigo-100 ${selectedChatId === chat.id ? 'bg-indigo-100' : ''}`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            {!chat.isGroup && otherParticipantPresence === 'online' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                            <span className="font-semibold">{getChatName(chat)}</span>
                                        </div>
                                        {hasUnread && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>}
                                    </div>
                                    {lastMessage && <p className="text-sm text-slate-500 truncate">{lastMessage.text}</p>}
                                </button>
                            </li>
                        )})}
                    </ul>
                </div>
                <div className="w-2/3 flex flex-col">
                    {selectedChat ? (
                        <>
                            <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-3">
                                {selectedChat.isGroup ? <UserGroupIcon className="w-8 h-8 text-slate-400" /> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">{getChatName(selectedChat).charAt(0)}</div>}
                                <div className="flex-grow">
                                    {isRenaming ? (
                                        <div className="flex gap-2">
                                            <input 
                                                value={newChatName} 
                                                onChange={(e) => setNewChatName(e.target.value)} 
                                                className="p-1 border rounded-md" 
                                                autoFocus
                                                onBlur={handleRenameChat}
                                            />
                                            <button onClick={handleRenameChat}><CheckIcon className="w-5 h-5 text-green-500"/></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => selectedChat.isGroup && setShowParticipantsModal(true)} className="font-bold text-left hover:underline disabled:no-underline" disabled={!selectedChat.isGroup}>
                                                {getChatName(selectedChat)}
                                            </button>
                                            {currentUser?.role === 'TEACHER' && selectedChat.isGroup && (
                                                <button onClick={() => { setIsRenaming(true); setNewChatName(selectedChat.name || ''); }}><PencilIcon className="w-4 h-4 text-slate-400 hover:text-slate-600"/></button>
                                            )}
                                        </div>
                                    )}
                                    {!selectedChat.isGroup && <p className="text-xs text-slate-500">{getOtherParticipantPresence(selectedChat)}</p>}
                                </div>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto bg-slate-100">
                                {selectedChat.messages.map(msg => {
                                    const sender = users.find(u => u.id === msg.senderId);
                                    const isCurrentUser = msg.senderId === currentUser?.id;
                                    return (
                                    <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}>
                                        <button 
                                            onClick={() => isCurrentUser && setReadReceiptsInfo(msg)} 
                                            className={`max-w-xs lg:max-w-md p-3 rounded-lg text-left ${isCurrentUser ? 'bg-indigo-500 text-white' : 'bg-white shadow-sm'}`}
                                            disabled={!isCurrentUser}
                                        >
                                            {!isCurrentUser && <p className="text-xs font-bold text-indigo-600 mb-1">{sender?.name}</p>}
                                            <p>{msg.text}</p>
                                            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-slate-400'} text-right`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {isCurrentUser && selectedChat.participants.some(p => p.userId !== currentUser!.id && (selectedChat.lastRead[p.userId] || 0) >= msg.timestamp) &&
                                                    <CheckIcon className="w-4 h-4 inline-block ml-1 text-blue-300"/>}
                                            </p>
                                        </button>
                                    </div>
                                )})}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200">
                                <div className="flex items-center gap-2">
                                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Напишите сообщение..." className="w-full p-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"/>
                                    <button type="submit" className="bg-indigo-600 text-white rounded-lg p-2 hover:bg-indigo-700 disabled:bg-slate-400" disabled={!newMessage.trim()}>
                                        <PaperAirplaneIcon className="w-6 h-6"/>
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-slate-500 bg-slate-50">
                            <p>Выберите чат, чтобы начать общение</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeacherView: React.FC = () => {
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

    const [announcementType, setAnnouncementType] = useState<'active' | 'info'>('info');
    const [announcementMessage, setAnnouncementMessage] = useState('');

    const [message, setMessage] = useState('');
    const [showMessageHistory, setShowMessageHistory] = useState(false);
    
    const [reviewingRoundResult, setReviewingRoundResult] = useState<StudentRoundResult | null>(null);
    const [gradeInput, setGradeInput] = useState<{ [id: string]: string }>({});
    const [commentInput, setCommentInput] = useState<{ [id: string]: string }>({});
    
    type GradeState = { grade: string; status: TestStatus; comment: string };
    const [historyGradeState, setHistoryGradeState] = useState<{ [resultId: string]: GradeState }>({});
    const [selectedResult, setSelectedResult] = useState<OnlineTestResult | null>(null);
    const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void } | null>(null);

    const onConfirm = (message: string, callback: () => void) => {
        setConfirmation({ message, onConfirm: callback });
    };
    
    const students = users.filter(u => u.role === UserRole.Student);
    
    useEffect(() => {
        if (view === 'online_test_history') {
            const initialState: { [resultId: string]: GradeState } = {};
            Object.values(onlineTestResults).flat().forEach(result => {
                initialState[result.id] = {
                    grade: result.grade?.toString() || '',
                    status: result.status || TestStatus.Passed,
                    comment: result.comment || ''
                };
            });
            setHistoryGradeState(initialState);
        }
    }, [view, onlineTestResults]);
    
    const handleSelectStudent = (student: User) => {
        setSelectedStudent(student);
        setGradeInput({}); 
        setCommentInput({});
        setView('student_detail');
    };
    
    const handleSaveOfflineTest = (e: React.FormEvent) => {
        e.preventDefault();
        if(!offlineStudentId || !offlineTestName) return;
        dispatch({ type: 'SAVE_OFFLINE_TEST', payload: { studentId: offlineStudentId, testName: offlineTestName, grade: offlineGrade, status: offlineStatus, comment: offlineComment } });
        setOfflineStudentId('');
        setOfflineTestName('');
        setOfflineComment('');
        setView('dashboard');
    };
    
    const handleUpdateOfflineTest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTest) return;
        const form = e.target as HTMLFormElement;
        const grade = parseInt((form.elements.namedItem('grade') as HTMLSelectElement).value);
        const status = (form.elements.namedItem('status') as HTMLSelectElement).value as TestStatus;
        const comment = (form.elements.namedItem('comment') as HTMLTextAreaElement).value;
        
        dispatch({ type: 'UPDATE_OFFLINE_TEST', payload: { ...editingTest, grade, status, comment } });
        setEditingTest(null);
    };

    const handleDeleteOfflineTestGrade = (studentId: string, resultId: string) => {
        onConfirm("Вы уверены, что хотите удалить оценку за этот тест?", () => {
            dispatch({ type: 'DELETE_OFFLINE_TEST_GRADE', payload: { studentId, resultId } });
        });
    }

    const handleStartOnlineTest = () => {
        if (!selectedOnlineTest || selectedStudentsForTest.length === 0) return;
        dispatch({ type: 'CREATE_ONLINE_TEST_SESSION', payload: { testId: selectedOnlineTest.id, invitedStudentIds: selectedStudentsForTest } });
    };
    
    const handleSendMessage = () => {
        if(!message.trim()) return;
        dispatch({ type: 'SEND_TEACHER_MESSAGE', payload: message });
        setMessage('');
    };

    const handleDeleteMessage = (messageId: string) => {
        onConfirm("Вы уверены, что хотите удалить это личное сообщение?", () => {
            dispatch({ type: 'DELETE_TEACHER_MESSAGE', payload: { messageId } });
        });
    };

    const handleSendAnnouncement = (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcementMessage.trim()) return;
        dispatch({ type: 'SEND_ANNOUNCEMENT', payload: { type: announcementType, message: announcementMessage } });
        setAnnouncementMessage('');
    };

    const handleDeleteAnnouncement = (announcementId: string) => {
        onConfirm("Вы уверены, что хотите удалить это объявление из истории?", () => {
            dispatch({ type: 'DELETE_ANNOUNCEMENT', payload: { announcementId } });
        });
    };

    useEffect(() => {
        if (activeOnlineTestSession) {
            setView('online_test_monitor');
        } else if (view === 'online_test_monitor') {
            setView('dashboard');
        }
    }, [activeOnlineTestSession, view]);

    const renderDashboard = () => (
        <>
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 rounded-2xl shadow-lg mb-8 flex items-center gap-6 text-white">
                <ClipboardDocumentListIcon className="w-20 h-20 opacity-80 hidden sm:block" />
                <div>
                    <h2 className="text-2xl font-bold">Панель управления</h2>
                    <p className="opacity-90 mt-1">Отслеживайте прогресс, оценивайте тесты и управляйте обучением.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <button onClick={() => setView('offline_grader')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-50 transition text-left flex items-center gap-4">
                    <DocumentTextIcon className="w-8 h-8 text-indigo-500"/>
                    <div>
                        <h3 className="text-lg font-bold">Оценить оффлайн тест</h3>
                        <p className="text-sm text-slate-500">Внести результаты</p>
                    </div>
                </button>
                 <button onClick={() => setView('online_test_manager')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-teal-50 transition text-left flex items-center gap-4">
                    <ClockIcon className="w-8 h-8 text-teal-500"/>
                    <div>
                        <h3 className="text-lg font-bold">Онлайн Тест</h3>
                        <p className="text-sm text-slate-500">Начать тест</p>
                    </div>
                </button>
                 <button onClick={() => setView('online_test_history')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition text-left flex items-center gap-4">
                    <ArchiveBoxIcon className="w-8 h-8 text-blue-500"/>
                    <div>
                        <h3 className="text-lg font-bold">История онлайн тестов</h3>
                        <p className="text-sm text-slate-500">Просмотр и оценка</p>
                    </div>
                </button>
                <button onClick={() => setView('content_editor')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-amber-50 transition text-left flex items-center gap-4">
                    <BookOpenIcon className="w-8 h-8 text-amber-500"/>
                    <div>
                        <h3 className="text-lg font-bold">Редактор контента</h3>
                        <p className="text-sm text-slate-500">Изменить юниты</p>
                    </div>
                </button>
                 <button onClick={() => setView('chat')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-purple-50 transition text-left flex items-center gap-4">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-500"/>
                    <div>
                        <h3 className="text-lg font-bold">Чат</h3>
                        <p className="text-sm text-slate-500">Общение с учениками</p>
                    </div>
                </button>
            </div>
            <h2 className="text-2xl font-bold mb-4">Прогресс учеников</h2>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ученик</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Завершено юнитов</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Средний балл</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {students.map(student => {
                            const progress = studentProgress[student.id] || {};
                            const completedUnits = Object.values(progress).filter((p: StudentUnitProgress) => Object.values(p.rounds).some((r: StudentRoundResult) => r.completed)).length;
                            
                            const progressValues = Object.values(progress) as StudentUnitProgress[];
                            const totalScore = progressValues.reduce((acc, unit) => {
                                const completedRounds = Object.values(unit.rounds).filter(r => r.completed);
                                return acc + completedRounds.reduce((sum, r) => sum + r.overallScore, 0);
                            }, 0);
                            const totalCompletedRounds = progressValues.reduce((acc, unit) => acc + Object.values(unit.rounds).filter(r => r.completed).length, 0);
                            const averageScore = totalCompletedRounds > 0 ? Math.round(totalScore / totalCompletedRounds) : 0;
                            
                            return (
                                <tr key={student.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{student.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{completedUnits} / {state.units.filter(u=>!u.isMistakeUnit).length}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{averageScore}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleSelectStudent(student)} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 float-right">
                                           <EyeIcon className="w-5 h-5"/> Посмотреть детали
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-8 p-6 bg-white rounded-2xl shadow-lg">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><MegaphoneIcon className="w-6 h-6 text-indigo-500"/> Центр объявлений для учеников</h3>
                
                <form onSubmit={handleSendAnnouncement} className="bg-slate-50 p-4 rounded-lg border-2 border-dashed mb-6">
                    <h4 className="font-bold mb-2">Создать новое объявление</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select value={announcementType} onChange={e => setAnnouncementType(e.target.value as any)} className="p-2 border rounded-lg bg-white">
                            <option value="info">Общее объявление (синий блок)</option>
                            <option value="active">Срочное напоминание (красный блок)</option>
                        </select>
                        <input 
                            value={announcementMessage} 
                            onChange={e => setAnnouncementMessage(e.target.value)} 
                            placeholder="Введите текст объявления..." 
                            className="flex-grow p-2 border rounded-lg" 
                            required
                        />
                        <button type="submit" className="px-4 py-2 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700">Отправить</button>
                    </div>
                </form>

                <h4 className="font-bold mb-2">История объявлений</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                    {announcements && announcements.length > 0 ? [...announcements].reverse().map(ann => (
                        <div key={ann.id} className={`p-3 rounded-lg flex justify-between items-start ${ann.type === 'active' ? 'bg-red-50 border-l-4 border-red-400' : 'bg-blue-50 border-l-4 border-blue-400'}`}>
                            <div>
                                <p>{ann.message}</p>
                                <p className="text-xs text-slate-500 mt-1">{new Date(ann.timestamp).toLocaleString()}</p>
                            </div>
                            <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-500 hover:text-red-700 ml-4 flex-shrink-0">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    )) : (
                        <p className="text-slate-500">История объявлений пуста.</p>
                    )}
                </div>
            </div>

            <div className="mt-8 p-6 bg-white rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2"><MegaphoneIcon className="w-6 h-6 text-slate-500"/> Личные сообщения (с колокольчиком)</h3>
                    <button onClick={() => setShowMessageHistory(true)} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        <ArchiveBoxIcon className="w-5 h-5" /> История
                    </button>
                </div>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Это сообщение увидят все ученики и у них появится колокольчик..." className="w-full p-2 border rounded-lg mb-2"></textarea>
                 <button onClick={handleSendMessage} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Отправить</button>
            </div>

            <Modal isVisible={showMessageHistory} onClose={() => setShowMessageHistory(false)} title="История личных сообщений">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {teacherMessages && teacherMessages.length > 0 ? [...teacherMessages].reverse().map(msg => (
                        <div key={msg.id} className="p-3 bg-slate-100 rounded-lg flex justify-between items-start">
                            <div>
                                <p>{msg.message}</p>
                                <p className="text-xs text-slate-500 text-left mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                            </div>
                             <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-500 hover:text-red-700 ml-4 flex-shrink-0">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    )) : <p>Нет отправленных сообщений.</p>}
                </div>
            </Modal>
        </>
    );

    const renderStudentDetail = () => {
        if (!selectedStudent) return null;
        const studentId = selectedStudent.id;
        const progress = studentProgress[studentId] || {};
        const studentOfflineTests = offlineTestResults[studentId] || [];
        
        const handleSetGrade = (unitId: string) => {
            const grade = parseInt(gradeInput[unitId]);
            const comment = commentInput[unitId];
            if (!isNaN(grade) && grade >= 2 && grade <= 5) {
                dispatch({ type: 'SET_UNIT_GRADE', payload: { studentId, unitId, grade, comment } });
                setGradeInput(prev => ({ ...prev, [unitId]: ''}));
                setCommentInput(prev => ({ ...prev, [unitId]: ''}));
            }
        };

        const handleDeleteUnitGrade = (unitId: string) => {
            onConfirm("Вы уверены, что хотите удалить оценку за этот юнит?", () => {
                dispatch({ type: 'DELETE_UNIT_GRADE', payload: { studentId, unitId } });
            });
        }
        
        const allUnitsToDisplay = state.units.filter(u => u.isMistakeUnit ? progress[u.id] : true);

        return (
            <div>
                {reviewingRoundResult && (
                    <AnswerReviewModal 
                        roundResult={reviewingRoundResult} 
                        onClose={() => setReviewingRoundResult(null)} 
                    />
                )}
                {editingTest && (
                     <Modal isVisible={true} onClose={() => setEditingTest(null)} title={`Редактировать: ${editingTest.testName}`}>
                         <form onSubmit={handleUpdateOfflineTest} className="space-y-4">
                             <div>
                                <label className="font-semibold">Оценка</label>
                                <select name="grade" defaultValue={editingTest.grade} className="w-full p-2 border rounded mt-1">
                                    <option>5</option><option>4</option><option>3</option><option>2</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold">Статус</label>
                                <select name="status" defaultValue={editingTest.status} className="w-full p-2 border rounded mt-1">
                                    <option value={TestStatus.Passed}>Прошёл</option>
                                    <option value={TestStatus.Failed}>Не прошёл</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold">Комментарий</label>
                                <textarea name="comment" defaultValue={editingTest.comment} className="w-full p-2 border rounded mt-1"></textarea>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingTest(null)} className="px-4 py-2 rounded bg-slate-200">Отмена</button>
                                <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white">Сохранить</button>
                            </div>
                         </form>
                     </Modal>
                )}
                <button onClick={() => setView('dashboard')} className="mb-4 text-indigo-600">← Назад к списку</button>
                <h2 className="text-2xl font-bold mb-4">Детализация: {selectedStudent.name}</h2>
                
                <h3 className="text-xl font-semibold mb-2">Прогресс по юнитам</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {allUnitsToDisplay.map(unit => {
                        const unitProgress = progress[unit.id];
                        return (
                            <div key={unit.id} className={`bg-white p-4 rounded-lg shadow ${unit.isMistakeUnit ? 'border-2 border-amber-400' : ''}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold">{unit.name}</h4>
                                     {typeof unitProgress?.grade !== 'undefined' && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-600">Оценка: {unitProgress.grade}</span>
                                            <button onClick={() => handleDeleteUnitGrade(unit.id)} className="text-red-500 hover:text-red-700">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {unitProgress?.comment && <p className="text-sm text-slate-600 mb-2 pl-2 border-l-2"><b>Комментарий:</b> {unitProgress.comment}</p>}
                                <div className="space-y-2 mt-2">
                                {unit.rounds.map(round => {
                                    const roundResult = unitProgress?.rounds[round.id];
                                    return (
                                        <div key={round.id} className="text-sm p-2 bg-slate-50 rounded-md flex justify-between items-center">
                                            <span>{round.name}: <span className="font-medium">{roundResult ? `${roundResult.overallScore}%` : 'Не пройдено'}</span></span>
                                            {roundResult && (
                                                <button onClick={() => setReviewingRoundResult(roundResult)} className="text-indigo-600 hover:text-indigo-800">
                                                    <EyeIcon className="w-5 h-5"/>
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                                </div>
                                {!unit.isMistakeUnit && (
                                    <div className="mt-4 pt-4 border-t space-y-2">
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="number" min="2" max="5" placeholder="Оценка" 
                                                className="w-20 text-center border rounded-lg shadow-sm"
                                                value={gradeInput[unit.id] || ''}
                                                onChange={e => setGradeInput(prev => ({...prev, [unit.id]: e.target.value}))}
                                            />
                                            <input 
                                                type="text" placeholder="Комментарий (необязательно)"
                                                className="flex-grow border rounded-lg shadow-sm px-2 py-1"
                                                value={commentInput[unit.id] || ''}
                                                onChange={e => setCommentInput(prev => ({...prev, [unit.id]: e.target.value}))}
                                            />
                                            <button onClick={() => handleSetGrade(unit.id)} className="text-green-500 hover:text-green-700 disabled:text-slate-300" disabled={!gradeInput[unit.id]}>
                                                <CheckCircleIcon className="w-6 h-6"/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <h3 className="text-xl font-semibold mb-2 mt-8">История офлайн-тестов</h3>
                <div className="bg-white p-4 rounded-lg shadow">
                    {studentOfflineTests.length > 0 ? (
                         <div className="space-y-4">
                            {studentOfflineTests.map(test => (
                                <div key={test.id} className="p-3 border-b last:border-b-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{test.testName}</p>
                                            <p className={`text-sm font-semibold ${test.status === TestStatus.Passed ? 'text-green-600' : 'text-red-600'}`}>
                                                Оценка: {test.grade} - {test.status === TestStatus.Passed ? 'Прошёл' : 'Не прошёл'}
                                            </p>
                                            {test.comment && <p className="text-sm text-slate-600 mt-1 pl-2 border-l-2"><b>Комментарий:</b> {test.comment}</p>}
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setEditingTest(test)} className="text-blue-500 hover:text-blue-700">
                                                <PencilIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => handleDeleteOfflineTestGrade(studentId, test.id)} className="text-red-500 hover:text-red-700">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500">У этого ученика еще нет оценок за офлайн-тесты.</p>
                    )}
                </div>
            </div>
        );
    };

    const renderOfflineGrader = () => (
         <div>
            <button onClick={() => setView('dashboard')} className="mb-4 text-indigo-600">← Назад</button>
            <h2 className="text-2xl font-bold mb-4">Оценить оффлайн тест</h2>
            <form onSubmit={handleSaveOfflineTest} className="bg-white p-6 rounded-lg shadow space-y-4">
                <div>
                    <label>Ученик</label>
                    <select value={offlineStudentId} onChange={e => setOfflineStudentId(e.target.value)} required className="w-full p-2 border rounded">
                        <option value="">Выберите ученика</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label>Название теста</label>
                    <input type="text" value={offlineTestName} onChange={e => setOfflineTestName(e.target.value)} required className="w-full p-2 border rounded" />
                </div>
                 <div>
                    <label>Оценка</label>
                    <select value={offlineGrade} onChange={e => setOfflineGrade(parseInt(e.target.value))} className="w-full p-2 border rounded">
                        <option>5</option><option>4</option><option>3</option><option>2</option>
                    </select>
                </div>
                <div>
                    <label>Комментарий</label>
                    <textarea value={offlineComment} onChange={e => setOfflineComment(e.target.value)} className="w-full p-2 border rounded" placeholder="Комментарий (необязательно)"></textarea>
                </div>
                 <div>
                    <label>Статус</label>
                    <select value={offlineStatus} onChange={e => setOfflineStatus(e.target.value as TestStatus)} className="w-full p-2 border rounded">
                        <option value={TestStatus.Passed}>Прошёл</option>
                        <option value={TestStatus.Failed}>Не прошёл</option>
                    </select>
                </div>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Сохранить</button>
            </form>
         </div>
    );
    
    const renderOnlineTestManager = () => (
        <div>
            <button onClick={() => setView('dashboard')} className="mb-4 text-indigo-600">← Назад</button>
            <h2 className="text-2xl font-bold mb-4">Управление Онлайн Тестом</h2>
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <div>
                    <label className="font-bold">1. Выберите тест</label>
                    <select onChange={e => setSelectedOnlineTest(onlineTests.find(t => t.id === e.target.value) || null)} className="w-full p-2 border rounded mt-2">
                        <option value="">Выберите юнит тест</option>
                        {onlineTests.map(test => <option key={test.id} value={test.id}>{test.name}</option>)}
                    </select>
                    {selectedOnlineTest && (
                      <div className="mt-2 text-sm p-2 bg-slate-50 rounded">
                        <p><b>Слова в тесте:</b> {selectedOnlineTest.words.map(w => w.english).join(', ')}</p>
                      </div>
                    )}
                </div>
                 <div>
                    <label className="font-bold">2. Выберите учеников</label>
                    <div className="mt-2 space-y-2">
                        {students.map(student => (
                            <div key={student.id}>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox"
                                        checked={selectedStudentsForTest.includes(student.id)}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setSelectedStudentsForTest(prev => [...prev, student.id]);
                                            } else {
                                                setSelectedStudentsForTest(prev => prev.filter(id => id !== student.id));
                                            }
                                        }}
                                    />
                                    {student.name}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={handleStartOnlineTest} disabled={!selectedOnlineTest || selectedStudentsForTest.length === 0} className="bg-green-500 text-white px-6 py-3 rounded-lg disabled:bg-slate-400">Открыть комнату и пригласить</button>
            </div>
        </div>
    );

    const renderOnlineTestMonitor = () => {
        if (!activeOnlineTestSession) return <p>Сессия не найдена.</p>;
        const test = onlineTests.find(t => t.id === activeOnlineTestSession.testId);
        const [reviewingStudent, setReviewingStudent] = useState<OnlineTestSessionStudent | null>(null);

        return (
            <div>
                 <h2 className="text-2xl font-bold mb-4">Мониторинг теста: {test?.name}</h2>
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-4">
                    <p>Статус: <span className="font-bold">{activeOnlineTestSession.status}</span></p>
                    <div>
                        {activeOnlineTestSession.status === 'WAITING' && (
                            <button onClick={() => dispatch({type: 'START_ONLINE_TEST'})} className="bg-green-500 text-white px-4 py-2 rounded-lg">Начать тест для всех</button>
                        )}
                        <button onClick={() => dispatch({ type: 'CLOSE_ONLINE_TEST_SESSION' })} className="bg-red-500 text-white px-4 py-2 rounded-lg ml-2">Завершить сессию</button>
                    </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-2">Участники</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.values(activeOnlineTestSession.students).map((student: OnlineTestSessionStudent) => (
                         <div key={student.studentId} className="bg-white p-4 rounded-lg shadow">
                            <div className='flex justify-between items-center'>
                                <p className="font-bold">{student.name}</p>
                                {student.timeFinished && <span className='text-sm text-slate-500'>Завершил</span>}
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-4 mt-2">
                                <div className="bg-blue-500 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ width: `${student.progress}%` }}>{student.progress}%</div>
                            </div>
                            <button onClick={() => setReviewingStudent(student)} className="text-sm text-indigo-600 mt-2">Посмотреть ответы</button>
                         </div>
                    ))}
                </div>
                 <Modal isVisible={!!reviewingStudent} onClose={() => setReviewingStudent(null)} title={`Ответы: ${reviewingStudent?.name}`}>
                     {reviewingStudent && test && (
                        <ul className="space-y-3 max-h-80 overflow-y-auto bg-slate-50 p-4 rounded-lg">
                            {test.words.map(word => {
                                const answer = reviewingStudent.answers.find(a => a.wordId === word.id);
                                return (
                                    <li key={word.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm">
                                        <div className="flex flex-col text-left">
                                            <span className="font-semibold">{word.english} ({word.russian})</span>
                                            <span className={`text-sm ${answer?.correct ? 'text-slate-500' : 'text-red-500'}`}>Ответ: {answer?.studentAnswer || 'Нет ответа'}</span>
                                        </div>
                                        {answer?.correct ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                 </Modal>
            </div>
        );
    };

    const renderOnlineTestHistory = () => {
        
        const handleHistoryGradeChange = (resultId: string, field: 'grade' | 'status' | 'comment', value: string | TestStatus) => {
            setHistoryGradeState(prev => ({
                ...prev,
                [resultId]: {
                    ...prev[resultId],
                    [field]: value,
                },
            }));
        };

        const handleSaveHistoryGrade = (result: OnlineTestResult) => {
            const currentGradeState = historyGradeState[result.id];
            if (!currentGradeState) return;

            const grade = parseInt(currentGradeState.grade);
            const isValidGrade = !isNaN(grade);

            dispatch({
                type: 'GRADE_ONLINE_TEST',
                payload: {
                    studentId: result.studentId,
                    resultId: result.id,
                    grade: isValidGrade ? grade : undefined,
                    status: currentGradeState.status,
                    comment: currentGradeState.comment,
                }
            });

            if (currentGradeState.status === TestStatus.Failed) {
                dispatch({ type: 'CREATE_MISTAKE_UNIT', payload: { studentId: result.studentId, testResult: result } });
            }
        };

        const handleDeleteOnlineTestGrade = (result: OnlineTestResult) => {
             onConfirm("Вы уверены, что хотите удалить оценку за этот онлайн тест?", () => {
                dispatch({ type: 'DELETE_ONLINE_TEST_GRADE', payload: { studentId: result.studentId, resultId: result.id } });
            });
        }

        const allResults = Object.values(onlineTestResults).flat().sort((a,b) => b.timestamp - a.timestamp);

        return (
            <div>
                 <button onClick={() => setView('dashboard')} className="mb-4 text-indigo-600">← Назад</button>
                 <h2 className="text-2xl font-bold mb-4">История Онлайн Тестов</h2>
                 <div className="bg-white p-4 rounded-lg shadow space-y-4">
                    {allResults.length > 0 ? allResults.map(result => {
                        const student = users.find(u => u.id === result.studentId);
                        const test = onlineTests.find(t => t.id === result.testId);
                        const currentGradeState = historyGradeState[result.id];

                        if (!currentGradeState) return null;

                        return (
                             <div key={result.id} className="p-3 border-b last:border-b-0">
                                 <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{test?.name}</p>
                                        <p className="text-sm text-slate-600">{student?.name} - {new Date(result.timestamp).toLocaleString()}</p>
                                        <p className="text-sm">Результат: {result.score}%, Время: {Math.round(result.timeTaken)}с</p>
                                    </div>
                                    <button onClick={() => setSelectedResult(result)} className="text-indigo-600"><EyeIcon className="w-5 h-5"/></button>
                                 </div>
                                 <div className="mt-2 space-y-2">
                                     <div className="flex gap-2 items-center">
                                         <select 
                                            value={currentGradeState.grade} 
                                            onChange={e => handleHistoryGradeChange(result.id, 'grade', e.target.value)}
                                            onBlur={() => handleSaveHistoryGrade(result)}
                                            className="border rounded p-1"
                                        >
                                            <option value="">Оценка</option><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option>
                                        </select>
                                        <select 
                                            value={currentGradeState.status} 
                                            onChange={e => handleHistoryGradeChange(result.id, 'status', e.target.value as TestStatus)}
                                            onBlur={() => handleSaveHistoryGrade(result)}
                                            className="border rounded p-1"
                                        >
                                            <option value={TestStatus.Passed}>Прошёл</option>
                                            <option value={TestStatus.Failed}>Не прошёл</option>
                                        </select>
                                        {typeof result.grade !== 'undefined' && (
                                             <button onClick={() => handleDeleteOnlineTestGrade(result)} className="text-red-500 hover:text-red-700">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        )}
                                     </div>
                                      <input 
                                        type="text" placeholder="Комментарий..."
                                        className="w-full border rounded-lg shadow-sm px-2 py-1 text-sm"
                                        value={currentGradeState.comment}
                                        onChange={(e) => handleHistoryGradeChange(result.id, 'comment', e.target.value)}
                                        onBlur={() => handleSaveHistoryGrade(result)}
                                    />
                                 </div>
                             </div>
                        )
                    }) : <p>Еще не было проведено ни одного онлайн теста.</p>}
                 </div>

                 <Modal isVisible={!!selectedResult} onClose={() => setSelectedResult(null)} title={`Ответы: ${users.find(u=>u.id === selectedResult?.studentId)?.name}`}>
                     {selectedResult && (
                        <ul className="space-y-3 max-h-80 overflow-y-auto bg-slate-50 p-4 rounded-lg">
                            {onlineTests.find(t=> t.id === selectedResult.testId)?.words.map(word => {
                                const answer = selectedResult.answers.find(a => a.wordId === word.id);
                                return (
                                    <li key={word.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm">
                                        <div className="flex flex-col text-left">
                                            <span className="font-semibold">{word.english} ({word.russian})</span>
                                            <span className={`text-sm ${answer?.correct ? 'text-slate-500' : 'text-red-500'}`}>Ответ: {answer?.studentAnswer || 'Нет ответа'}</span>
                                        </div>
                                        {answer?.correct ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                 </Modal>
            </div>
        )
    };
    
    const renderContentEditor = () => {
        const selectedUnit = state.units.find(u => u.id === editingUnit?.id);
        const selectedRound = selectedUnit?.rounds.find(r => r.id === editingRound?.id);
        const regularUnits = state.units.filter(u => !u.isMistakeUnit);
        const mistakeUnits = state.units.filter(u => u.isMistakeUnit);

        const handleAddUnit = (e: React.FormEvent) => {
            e.preventDefault();
            if(newUnitName.trim()) {
                const sourceTest = isNewUnitMistake ? state.onlineTests.find(t => t.id === newUnitSourceTestId) : undefined;
                dispatch({ 
                    type: 'ADD_UNIT', 
                    payload: { 
                        unitName: newUnitName, 
                        isMistakeUnit: isNewUnitMistake, 
                        sourceTestId: sourceTest?.id, 
                        sourceTestName: sourceTest?.name,
                    }
                });
                setNewUnitName('');
                setIsNewUnitMistake(false);
                setNewUnitSourceTestId('');
            }
        };

        const handleAddRound = (e: React.FormEvent) => {
            e.preventDefault();
            if(newRoundName.trim() && selectedUnit) {
                dispatch({ type: 'ADD_ROUND', payload: { unitId: selectedUnit.id, roundName: newRoundName }});
                setNewRoundName('');
            }
        };

        const handleDeleteUnit = (unitId: string) => {
            onConfirm("Вы уверены, что хотите удалить этот юнит и все его содержимое?", () => {
                dispatch({ type: 'DELETE_UNIT', payload: { unitId } });
            });
        };

        const handleDeleteRound = (roundId: string) => {
            onConfirm("Вы уверены, что хотите удалить этот раунд и все слова в нем?", () => {
                dispatch({ type: 'DELETE_ROUND', payload: { unitId: selectedUnit!.id, roundId } });
            });
        };

        if (!selectedUnit) {
            return (
                <div>
                    <button onClick={() => setView('dashboard')} className="mb-4 text-indigo-600">← Назад</button>
                    <h2 className="text-2xl font-bold mb-4">Редактор контента: Выберите юнит</h2>
                    
                    <h3 className="text-xl font-semibold mt-6 mb-2">Основные юниты</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {regularUnits.map(unit => (
                            <div key={unit.id} className="flex items-center gap-2">
                                <button onClick={() => setEditingUnit(unit)} className="flex-grow p-4 bg-white rounded-lg shadow text-left hover:bg-slate-50">
                                    <h3 className="font-bold">{unit.name}</h3>
                                </button>
                                <button onClick={() => handleDeleteUnit(unit.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>

                    <h3 className="text-xl font-semibold mt-6 mb-2">Работы над ошибками</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mistakeUnits.map(unit => (
                            <div key={unit.id} className="flex items-center gap-2">
                                <button onClick={() => setEditingUnit(unit)} className="flex-grow p-4 bg-white rounded-lg shadow text-left hover:bg-slate-50 border-2 border-amber-400">
                                    <h3 className="font-bold">{unit.name}</h3>
                                    {unit.sourceTestName && <p className="text-xs text-slate-500">Из теста: {unit.sourceTestName}</p>}
                                </button>
                                <button onClick={() => handleDeleteUnit(unit.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddUnit} className="mt-6 p-4 bg-slate-50 rounded-lg border-2 border-dashed">
                        <h4 className="font-bold mb-2">Создать новый юнит</h4>
                        <div className="flex gap-2 mb-2">
                            <input value={newUnitName} onChange={e => setNewUnitName(e.target.value)} placeholder="Название нового юнита" className="flex-grow p-2 border rounded-lg" required/>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" id="is-mistake-unit" checked={isNewUnitMistake} onChange={e => setIsNewUnitMistake(e.target.checked)} />
                            <label htmlFor="is-mistake-unit">Особый юнит (Работа над ошибками)</label>
                        </div>
                        {isNewUnitMistake && (
                            <select value={newUnitSourceTestId} onChange={e => setNewUnitSourceTestId(e.target.value)} className="w-full p-2 border rounded-lg mb-2">
                                <option value="">Выберите исходный тест</option>
                                {state.onlineTests.map(test => <option key={test.id} value={test.id}>{test.name}</option>)}
                            </select>
                        )}
                        <button type="submit" className="px-4 py-2 rounded-lg text-white font-semibold bg-green-600 hover:bg-green-700 flex items-center gap-2"><PlusCircleIcon className="w-5 h-5"/> Создать</button>
                    </form>
                </div>
            )
        }
        
        if (!selectedRound) {
             return (
                <div>
                    <button onClick={() => setEditingUnit(null)} className="mb-4 text-indigo-600">← Назад к юнитам</button>
                    <h2 className="text-2xl font-bold mb-4">Юнит: {selectedUnit.name}</h2>
                    <h3 className="text-xl font-semibold mb-2">Выберите раунд для редактирования</h3>
                    <div className="space-y-3">
                        {selectedUnit.rounds.map(round => (
                            <div key={round.id} className="flex items-center gap-2">
                                <button onClick={() => setEditingRound(round)} className="flex-grow p-4 bg-white rounded-lg shadow text-left hover:bg-slate-50">
                                    <h3 className="font-bold">{round.name}</h3>
                                </button>
                                <button onClick={() => handleDeleteRound(round.id)} className="p-2 text-red-500 hover:text-red-700">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleAddRound} className="mt-6 p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-bold mb-2">Создать новый раунд</h4>
                        <div className="flex gap-2">
                            <input value={newRoundName} onChange={e => setNewRoundName(e.target.value)} placeholder="Название нового раунда" className="flex-grow p-2 border rounded-lg" required/>
                            <button type="submit" className="px-4 py-2 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Создать</button>
                        </div>
                    </form>
                </div>
            )
        }

        return (
            <div>
                <button onClick={() => setEditingRound(null)} className="mb-4 text-indigo-600">← Назад к раундам</button>
                <h2 className="text-2xl font-bold mb-4">Редактирование: {selectedUnit.name} - {selectedRound.name}</h2>
                <div className="space-y-4">
                    {selectedRound.words.map(word => (
                        <WordItemEditor key={word.id} word={word} unitId={selectedUnit.id} roundId={selectedRound.id} onConfirm={onConfirm} />
                    ))}
                </div>
                <AddWordForm unitId={selectedUnit.id} roundId={selectedRound.id}/>
            </div>
        )
    };

    const renderContent = () => {
        switch(view) {
            case 'dashboard': return renderDashboard();
            case 'student_detail': return renderStudentDetail();
            case 'offline_grader': return renderOfflineGrader();
            case 'online_test_manager': return renderOnlineTestManager();
            case 'online_test_monitor': return renderOnlineTestMonitor();
            case 'online_test_history': return renderOnlineTestHistory();
            case 'online_test_results': return null;
            case 'content_editor': return renderContentEditor();
            case 'chat': return <ChatInterface onBack={() => setView('dashboard')} />;
            default: return renderDashboard();
        }
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:p-8 py-8">
            {confirmation && (
                <Modal isVisible={true} onClose={() => setConfirmation(null)} title="Подтверждение">
                    <p>{confirmation.message}</p>
                    <div className="flex justify-end gap-4 mt-4">
                        <button onClick={() => setConfirmation(null)} className="px-4 py-2 rounded-lg bg-slate-200">Отмена</button>
                        <button onClick={() => { confirmation.onConfirm(); setConfirmation(null); }} className="px-4 py-2 rounded-lg bg-red-500 text-white">Удалить</button>
                    </div>
                </Modal>
            )}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-bold">Панель Учителя</h1>
                <button onClick={() => dispatch({ type: 'LOGOUT' })} className="font-medium text-indigo-600 hover:text-indigo-500">Выйти</button>
            </div>
            {renderContent()}
        </div>
    )
};

export default TeacherView;