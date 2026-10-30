'use client';

// ============================================================
// components/chat/chat-widget.tsx — Nút Chatbot tròn cố định ở góc dưới cùng bên phải
// ============================================================

import { useState } from 'react';
import { ChatWindow } from './chat-window';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Toggle Button — Nút tròn góc dưới cùng bên phải */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/40 hover:shadow-orange-500/60 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            aria-label="Mở trợ lý tư vấn AI"
            title="Chat tư vấn phụ tùng 24/7"
          >
            {/* Online indicator badge */}
            <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-400 border-2 border-white" />
            </span>

            {/* Chatbot Icon */}
            <svg
              className="w-7 h-7 text-white drop-shadow-sm group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="6" width="18" height="13" rx="4" />
              <path d="M12 2v4" />
              <circle cx="12" cy="2" r="1" fill="currentColor" />
              <circle cx="8.5" cy="12" r="1.25" fill="currentColor" />
              <circle cx="15.5" cy="12" r="1.25" fill="currentColor" />
              <path d="M9 15.5c.8.6 1.8 1 3 1s2.2-.4 3-1" />
            </svg>
          </button>
        )}
      </div>

      {/* Pop-up Chat Window */}
      {isOpen && (
        <ChatWindow onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
