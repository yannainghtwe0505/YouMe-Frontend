import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';

export default function MessagesPage() {
  const { matchId } = useParams();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await api.get(`/matches/${matchId}/messages`);
      const raw = res.data?.content ?? res.data;
      setMessages(Array.isArray(raw) ? raw : []);
      setLoading(false);
    } catch (err) {
      setError(err.response?.status === 403 ? 'You are not part of this match.' : 'Failed to load messages');
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!body.trim()) return;

    setSending(true);
    setError(null);

    try {
      await api.post(`/matches/${matchId}/messages`, { body });
      setBody('');
      // Reload messages to show the new one
      loadMessages();
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return (
    <div className="loading fade-in">
      <div className="pulse">Loading messages...</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="card">
        <div className="chat-header">
          <Link to="/messages" className="chat-back" aria-label="Back to conversations">‹</Link>
          <div
            className="avatar-small chat-header-avatar"
          >
            💬
          </div>
          <div className="chat-header-text">
            <h1>Chat</h1>
            <p>Match #{matchId}</p>
          </div>
        </div>

        <div className="message-list chat-thread">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={msg.id ?? `m-${index}`}
                className={`message-item ${msg.isFromCurrentUser ? 'own' : 'other'}`}
              >
                {msg.body}
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-light)',
              padding: '20px',
              fontSize: '14px'
            }}>
              👋 Start a conversation!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
          alignItems: 'flex-end'
        }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="form-input"
            style={{
              margin: 0,
              flex: 1,
              minHeight: '44px',
              maxHeight: '100px',
              resize: 'none'
            }}
            disabled={sending}
            rows={1}
          />
          <button
            onClick={sendMessage}
            className="btn btn-primary"
            disabled={!body.trim() || sending}
            style={{
              padding: '12px 16px',
              minWidth: '60px'
            }}
          >
            {sending ? '...' : '📤'}
          </button>
        </div>

        {error && (
          <div style={{
            color: '#e17055',
            fontSize: '14px',
            marginTop: '8px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
