import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import Avatar from './Avatar';
import { useSpeech } from '../hooks/useSpeech';
import { sendChatMessage, type ChatMessage } from '../services/api';

export default function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSupported,
  } = useSpeech();

  // Auto-fill input from voice transcript
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(text, messages.slice(-10));
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
      };
      setMessages([...newMessages, assistantMessage]);

      if (autoSpeak) {
        speak(response.response);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content:
            'I apologize, but I encountered an error. Please try again or check your connection.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      // Auto-send after voice input stops
      setTimeout(() => {
        const btn = document.getElementById('send-btn');
        btn?.click();
      }, 500);
    } else {
      startListening();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content: string) => {
    // Convert markdown-like formatting to HTML
    return content
      .split('\n')
      .map((line, i) => {
        // Bold
        let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (formatted.startsWith('• ') || formatted.startsWith('- ')) {
          formatted = `<li class="ml-4">${formatted.slice(2)}</li>`;
        }
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: formatted }}
            className="block"
          />
        );
      });
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Avatar */}
      <div className="flex justify-center py-4">
        <Avatar isSpeaking={isSpeaking} isThinking={isLoading} />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">Welcome! I'm NiVa, your Nipah Virus Assistant.</p>
            <p className="text-sm">
              Ask me anything about Nipah virus — symptoms, prevention, transmission, or treatment.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[
                'What is Nipah virus?',
                'What are the symptoms?',
                'How does it spread?',
                'How to prevent it?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => {
                      const btn = document.getElementById('send-btn');
                      btn?.click();
                    }, 100);
                  }}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`chat-message rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-gray-800 text-gray-200 rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-1">
                  {formatMessage(msg.content)}
                  <button
                    onClick={() => (isSpeaking ? stopSpeaking() : speak(msg.content))}
                    className="mt-2 text-xs text-gray-400 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                  >
                    {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    {isSpeaking ? 'Stop' : 'Listen'}
                  </button>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 bg-gray-800 rounded-2xl px-4 py-2">
          {isSupported && (
            <button
              onClick={handleVoiceToggle}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Ask about Nipah virus...'}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
            disabled={isLoading}
          />

          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              autoSpeak ? 'text-indigo-400' : 'text-gray-500'
            }`}
            title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
          >
            {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            id="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-full bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
