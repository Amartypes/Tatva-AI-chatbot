import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:3001";

const WELCOME_MESSAGE = {
  role: "assistant",
  content: `👋 Hi! I'm **Tatva**, your personal interior design assistant from TatvaOps.

I can help you:
- 🏠 Find interior design vendors that match your budget & city
- ⭐ Compare top-rated designers
- 📞 Connect you with the right vendor
- 💡 Explain how TatvaOps works

What are you looking for today? Tell me about your space, budget, and city — and I'll find the perfect match for you!`,
};

const SUGGESTIONS = [
  "Interior design under 5 lakh in Bangalore",
  "Which vendor is best rated?",
  "How does payment work?",
  "Compare top 2 vendors",
];

function parseMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n• /g, "\n<li>")
    .replace(/\n- /g, "\n<li>")
    .replace(/(<li>.*)/gs, (match) => `<ul>${match.replace(/<li>/g, "<li>")}</ul>`)
    .replace(/<\/ul><ul>/g, "")
    .replace(/\n/g, "<br/>");
}

function Message({ msg, isLast }) {
  const isUser = msg.role === "user";
  return (
    <div className={`message-row ${isUser ? "user-row" : "bot-row"}`}>
      {!isUser && <div className="avatar bot-avatar"><span>T</span></div>}
      <div className={`bubble ${isUser ? "user-bubble" : "bot-bubble"} ${isLast && !isUser ? "animate-in" : ""}`}>
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
        )}
      </div>
      {isUser && <div className="avatar user-avatar"><span>U</span></div>}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-row bot-row">
      <div className="avatar bot-avatar"><span>T</span></div>
      <div className="bubble bot-bubble typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput("");
    const userMsg = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const history = newMessages.slice(1).slice(-10).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: history.slice(0, -1) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ Something went wrong: ${err.message}. Please check that the backend is running.`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">T</div>
            <div className="logo-text">
              <span className="logo-name">TatvaOps</span>
              <span className="logo-sub">AI Design Assistant</span>
            </div>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            <span>Online</span>
          </div>
        </div>
      </header>

      <main className="chat-area">
        <div className="messages">
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} isLast={i === messages.length - 1} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </main>

      {messages.length <= 1 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => sendMessage(s)}>{s}</button>
          ))}
        </div>
      )}

      <footer className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            className="input-box"
            placeholder="Ask me about interior design vendors..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className={`send-btn ${loading || !input.trim() ? "disabled" : ""}`}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="footer-note">Powered by TatvaOps · Verified vendors · Milestone payments</p>
      </footer>
    </div>
  );
}