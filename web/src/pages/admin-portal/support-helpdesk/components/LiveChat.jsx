import React, { useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import AppImage from '../../../../components/AppImage';
import { useLanguage } from '../../../../contexts/LanguageContext';

const LiveChat = () => {
    const { t } = useLanguage();
    const [selectedChat, setSelectedChat] = useState(1);
    const [messageInput, setMessageInput] = useState('');

    const chats = [
        {
            id: 1,
            user: 'Dr. Sarah Wilson',
            clinic: 'Smile Dental',
            avatar: 'https://i.pravatar.cc/150?u=sarah',
            lastMessage: 'I need help exporting the patient list.',
            time: '5m',
            unread: 2,
            status: 'online',
        },
        {
            id: 2,
            user: 'Michael Chen',
            clinic: 'Healthy Teeth Center',
            avatar: 'https://i.pravatar.cc/150?u=michael',
            lastMessage: 'Is the system down for maintenance?',
            time: '12m',
            unread: 0,
            status: 'offline',
        },
        {
            id: 3,
            user: 'Emma Davis',
            clinic: 'Bright Smile Studio',
            avatar: 'https://i.pravatar.cc/150?u=emma',
            lastMessage: 'Thanks for your help!',
            time: '1h',
            unread: 0,
            status: 'online',
        },
    ];

    const messages = [
        { id: 1, sender: 'agent', text: 'Hello Dr. Wilson, how can I help you today?', time: '10:00 AM' },
        { id: 2, sender: 'user', text: 'Hi! I need help exporting the patient list.', time: '10:02 AM' },
        { id: 3, sender: 'user', text: 'I can\'t find the button.', time: '10:02 AM' },
        { id: 4, sender: 'agent', text: 'No problem. Go to the "Patients" tab and look for the "Export" button in the top right corner.', time: '10:04 AM' },
    ];

    const activeChat = chats.find(c => c.id === selectedChat);

    return (
        <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden h-[600px] flex">
            {/* Sidebar */}
            <div className="w-80 border-r border-border/40 flex flex-col">
                <div className="p-4 border-b border-border/40">
                    <h3 className="font-semibold text-primary mb-3">{t('admin.supportHelpdesk.liveChat.sidebarTitle')}</h3>
                    <div className="relative">
                        <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                        <input
                            type="text"
                            placeholder={t('admin.supportHelpdesk.liveChat.searchPlaceholder')}
                            className="w-full bg-surface-elevated pl-9 pr-4 py-2 rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => setSelectedChat(chat.id)}
                            className={`p-4 flex gap-3 cursor-pointer hover:bg-surface-elevated/50 transition-colors ${selectedChat === chat.id ? 'bg-surface-elevated border-l-4 border-accent' : 'border-l-4 border-transparent'}`}
                        >
                            <div className="relative">
                                <AppImage src={chat.avatar} alt={chat.user} className="w-10 h-10 rounded-full" />
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${chat.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                    <h4 className="font-medium text-primary text-sm truncate">{chat.user}</h4>
                                    <span className="text-xs text-secondary whitespace-nowrap">{chat.time}</span>
                                </div>
                                <p className="text-xs text-secondary truncate">{chat.lastMessage}</p>
                            </div>
                            {chat.unread > 0 && (
                                <div className="flex flex-col justify-center">
                                    <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                                        {chat.unread}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-surface-elevated/30">
                {activeChat ? (
                    <>
                        <div className="p-4 border-b border-border/40 flex justify-between items-center bg-surface">
                            <div className="flex items-center gap-3">
                                <AppImage src={activeChat.avatar} alt={activeChat.user} className="w-10 h-10 rounded-full" />
                                <div>
                                    <h3 className="font-semibold text-primary">{activeChat.user}</h3>
                                    <p className="text-xs text-secondary">{activeChat.clinic}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors" title={t('admin.supportHelpdesk.liveChat.transfer')}>
                                    <AppIcon name="Users" size={18} />
                                </button>
                                <button className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/20 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors">
                                    {t('admin.supportHelpdesk.liveChat.endChat')}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.sender === 'agent'
                                            ? 'bg-accent text-white rounded-tr-none'
                                            : 'bg-surface-elevated text-primary rounded-tl-none border border-border/40'
                                        }`}>
                                        <p className="text-sm">{msg.text}</p>
                                        <p className={`text-[10px] mt-1 text-right ${msg.sender === 'agent' ? 'text-white/70' : 'text-secondary'}`}>
                                            {msg.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-surface border-t border-border/40">
                            <div className="flex gap-2">
                                <button className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors">
                                    <AppIcon name="Paperclip" size={20} />
                                </button>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder={t('admin.supportHelpdesk.liveChat.inputPlaceholder')}
                                        className="w-full bg-surface-elevated border border-border/40 rounded-xl pl-4 pr-10 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
                                    />
                                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
                                        <AppIcon name="Send" size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-secondary">
                        <AppIcon name="MessageSquare" size={48} className="mb-4 opacity-20" />
                        <p>{t('admin.supportHelpdesk.liveChat.noChatSelected')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveChat;
