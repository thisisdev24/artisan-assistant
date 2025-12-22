import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../utils/apiClient';

const AdminChat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentAdmin, setCurrentAdmin] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        fetchCurrentAdmin();
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Simple polling every 3s
        return () => clearInterval(interval);
    }, []);

    const fetchCurrentAdmin = async () => {
        try {
            const res = await apiClient.get('/api/admin/me');
            setCurrentAdmin(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await apiClient.get('/api/admin-chat?limit=50');
            // If we differ in length or last ID, update. Simple check for now.
            setMessages(prev => {
                if (res.data.length !== prev.length || (res.data.length > 0 && res.data[res.data.length - 1]._id !== prev[prev.length - 1]?._id)) {
                    return res.data;
                }
                return prev;
            });
        } catch (err) {
            if (err.response?.status === 401) {
                // Stop polling if auth fails
                setLoading(false);
                return;
            }
            console.error('Error fetching chat:', err);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            await apiClient.post('/api/admin-chat/send', {
                content: input,
                type: 'text'
            });
            setInput('');
            fetchMessages();
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    const handleAction = async (messageId, action) => {
        try {
            if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;

            await apiClient.post(`/api/admin-chat/action/${messageId}`, { action });
            fetchMessages(); // Refresh to show updated status
        } catch (err) {
            console.error('Action failed:', err);
            alert('Action failed: ' + (err.response?.data?.msg || 'Unknown error'));
        }
    };

    // Helper to send a test action request (For Demo Purposes)
    const sendDemoAction = async () => {
        const sellerId = prompt("Enter Seller ID to create approval request for:");
        if (!sellerId) return;
        try {
            await apiClient.post('/api/admin-chat/send', {
                content: 'Requesting approval for new seller verification.',
                type: 'action_request',
                actionType: 'APPROVE_SELLER',
                targetId: sellerId,
                targetName: 'Demo Seller'
            });
            fetchMessages();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-500">Loading chat...</div>;

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h3 className="font-semibold text-gray-800">Admin Team Chat</h3>
                <button onClick={sendDemoAction} className="text-xs text-indigo-600 hover:text-indigo-800 underline">
                    + Test Action Request
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg) => {
                    const isMe = currentAdmin && msg.sender?._id === currentAdmin._id;

                    return (
                        <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${msg.type === 'action_request' ? 'items-center' : ''}`}>
                            <div className={`max-w-[80%] ${msg.type === 'action_request' ? 'w-full max-w-sm' : ''}`}>

                                {/* Sender Name (Only for others) */}
                                {!isMe && (
                                    <div className="text-xs text-gray-500 mb-1 ml-1">
                                        {msg.sender?.name || 'Unknown Admin'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}

                                {/* Message Bubble */}
                                {msg.type === 'text' ? (
                                    <div className={`px-4 py-2 shadow-sm ${isMe
                                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none'
                                        : 'bg-white border text-gray-800 rounded-2xl rounded-tl-none'
                                        }`}>
                                        {msg.content}
                                    </div>
                                ) : (
                                    // Action Request Card styling... (keep logic but maybe adjust positioning?)
                                    // For now keeping it simple as existing logic
                                    <div className="bg-white border border-indigo-100 rounded-xl shadow-sm p-4 w-full">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{msg.actionType.replace('_', ' ')}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 mb-3 font-medium">{msg.content}</p>

                                        {msg.targetName && (
                                            <div className="bg-gray-50 p-2 rounded text-xs text-center border mb-3 text-gray-600">
                                                Target: <span className="font-mono">{msg.targetName}</span>
                                            </div>
                                        )}

                                        {/* Action Buttons or Status */}
                                        {msg.actionStatus === 'pending' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAction(msg._id, 'approve')}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(msg._id, 'reject')}
                                                    className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border border-transparent hover:border-red-200 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={`text-center py-1.5 rounded-lg text-sm font-medium border ${msg.actionStatus === 'completed'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-gray-100 text-gray-500 border-gray-200'
                                                }`}>
                                                {msg.actionStatus === 'completed' ? '✓ Approved' : '✕ Declined'}
                                            </div>
                                        )}

                                        {msg.performedBy && (
                                            <div className="text-[10px] text-center text-gray-400 mt-2">
                                                Processed by {msg.performedBy.name}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Timestamp for Me */}
                                {isMe && (
                                    <div className="text-[10px] text-gray-400 mt-1 mr-1 text-right">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-3 border-t bg-white rounded-b-lg flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default AdminChat;
