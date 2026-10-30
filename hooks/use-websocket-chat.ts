'use client';

// ============================================================
// hooks/use-websocket-chat.ts — Hook điều khiển kết nối WebSocket AI
// Endpoint: wss://9trjqwwev1.execute-api.ap-southeast-1.amazonaws.com/production
// Hỗ trợ tự động reconnect ổn định, keepalive ping, và lưu trữ phiên
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { generateGuestId } from '@/lib/utils';
import { checkOrderInChat } from '@/lib/order-chat-helper';
import type { ChatMessage, ConnectionStatus, WebSocketPayload, WebSocketResponse } from '@/types/chat';
import type { ProductSummary } from '@/types/product';

const WS_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL ??
  'wss://9trjqwwev1.execute-api.ap-southeast-1.amazonaws.com/production';

const STORAGE_CHAT_KEY = 'phutung_chat_history_v2';

const WELCOME_CONTENT =
  'Xin chào! Tôi là **Chuyên viên tư vấn AI** của hệ thống Phụ Tùng Xe Máy Chính Hãng.\n\nTôi có thể hỗ trợ bạn ngay các vấn đề:\n- **Chẩn đoán kỹ thuật**: Bắt bệnh tiếng kêu lạ, rung đầu, trượt côn, hao xăng.\n- **Tư vấn phụ tùng**: Gợi ý dầu nhớt, nhông sên dĩa, bố thắng, phuộc nhún chuẩn theo từng dòng xe.\n- **Tra cứu đơn hàng**: Kiểm tra nhanh trạng thái đơn hàng theo mã đơn.\n\nBạn có thể chọn một chủ đề phổ biến bên dưới hoặc nhập trực tiếp câu hỏi.';

// Cơ sở dữ liệu kiến thức kỹ thuật chuẩn xác kèm sản phẩm thực tế
const KNOWLEDGE_BASE: {
  keywords: string[];
  reply: string;
  product?: ProductSummary;
}[] = [
  {
    keywords: ['cụp cụp', 'gờ giảm tốc', 'chén cổ', 'cổ kêu', 'kêu lụp cụp'],
    reply:
      '### Chẩn đoán hệ thống cổ lái & giảm xóc trước\n\nHiện tượng xe đi qua gờ giảm tốc hoặc ổ gà phát ra tiếng **"cụp cụp"** ở phần đầu xe thường xuất phát từ **bộ chén cổ (bạc đạn cổ lái)** bị mòn khuyết rãnh bi, rơ lỏng hoặc khô mỡ chịu nhiệt.\n\n**Hướng khắc phục kỹ thuật:**\n1. Kiểm tra độ rơ dọc của chảng ba và siết lại đai ốc chén cổ đúng lực tiêu chuẩn.\n2. Nếu bi cổ đã khuyết rãnh (tay lái bị sượng ở vị trí giữa), cần thay mới bộ chén cổ chính hãng.\n3. Kiểm tra thêm mức dầu phuộc trước xem có bị xì phốt dầu hay không.',
    product: {
      product_id: 'PROD_SUS_012',
      name: 'Bộ chén cổ SKF chính hãng chống kêu cụp',
      price: 350000,
      image_url: 'https://d1ksuy3hfmko20.cloudfront.net/images/chen-co-skf-real.jpg',
      stock: 45,
      category: 'Hệ thống giảm xóc & Lái',
    },
  },
  {
    keywords: ['nhớt', 'dầu máy', 'motul', 'phượt', 'thay nhớt', 'nhớt máy'],
    reply:
      '### Tư vấn dầu nhớt động cơ đường dài\n\nKhi vận hành liên tục ở tốc độ cao hoặc đi phượt đường dài, bạn nên sử dụng dầu nhớt **Tổng hợp toàn phần 100% (Fully Synthetic)** cấp độ nhớt **10W40** để duy trì áp suất dầu ổn định ở nhiệt độ cao.\n\n**Tiêu chuẩn khuyến nghị:**\n- **Xe số / Xe côn tay**: Chọn chuẩn **JASO MA2** (như Motul 300V 10W40 hoặc Motul 7100) giúp bắt côn nhạy, chống trượt bố nồi.\n- **Xe tay ga**: Chọn chuẩn **JASO MB** (như Liqui Moly Molygen Scooter) giúp giảm ma sát và mát máy.',
    product: {
      product_id: 'PROD_OIL_010',
      name: 'Nhớt Motul 300V Factory Line Road Racing 10W40 1L',
      price: 420000,
      image_url: 'https://d1ksuy3hfmko20.cloudfront.net/images/motul-300v-real.jpg',
      stock: 65,
      category: 'Dầu nhớt & Phụ gia',
    },
  },
  {
    keywords: ['bố thắng', 'thắng đĩa', 'phanh', 'kêu rít', 'má phanh', 'bố đĩa'],
    reply:
      '### Chẩn đoán hệ thống phanh đĩa\n\nTiếng kêu rít khi bóp phanh hoặc cảm giác phanh bị trơ trượt thường do bề mặt má phanh đã mòn sát đế kim loại, bị chai cứng do nhiệt hoặc kẹt cát ở đĩa thắng.\n\n**Giải pháp xử lý:**\n- Thay thế má phanh hợp kim gốm **Ceramic (Elig / Nissin)** giúp tăng lực phanh êm ái, tản nhiệt nhanh và không làm xước đĩa thắng.\n- Vệ sinh sạch sẽ ắc heo dầu và piston phanh khi lắp bố mới.',
    product: {
      product_id: 'PROD_BRK_010',
      name: 'Bố thắng đĩa trước Elig EM050 Ceramic',
      price: 150000,
      image_url: 'https://d1ksuy3hfmko20.cloudfront.net/images/elig-em050-real.jpg',
      stock: 80,
      category: 'Hệ thống phanh',
    },
  },
  {
    keywords: ['sên', 'nhông sên dĩa', 'nhông xích', 'chùng sên', 'giật sên', 'did', 'lách cách'],
    reply:
      '### Tư vấn hệ thống truyền động Nhông Sên Dĩa\n\nHiện tượng xe phát tiếng kêu lách cách ở hộp sên hoặc giật cục khi lên/hạ ga là dấu hiệu mắt sên đã bị giãn không đều (sên nhảy) hoặc đỉnh răng nhông dĩa đã mòn nhọn.\n\n**Khuyến nghị thay thế:**\n- Nên thay đồng bộ cả 3 chi tiết **Nhông - Sên - Dĩa** (tránh chỉ thay riêng dây sên vì răng dĩa cũ sẽ làm hư sên mới rất nhanh).\n- Dòng **DID 428HDS Vàng (10 ly)** chịu lực kéo cao và hạn chế giãn sên vượt trội.',
    product: {
      product_id: 'PROD_DRV_010',
      name: 'Bộ nhông sên dĩa DID 428HDS Vàng 10 ly',
      price: 480000,
      image_url: 'https://d1ksuy3hfmko20.cloudfront.net/images/did-428hds-real.jpg',
      stock: 35,
      category: 'Hệ thống truyền động',
    },
  },
  {
    keywords: ['bảo dưỡng', 'định kỳ', 'bao lâu', 'kiểm tra'],
    reply:
      '### Lịch bảo dưỡng xe máy định kỳ tiêu chuẩn\n\nĐể xe luôn vận hành êm ái và bền bỉ, bạn nên lưu ý các mốc bảo dưỡng quan trọng sau:\n1. **Dầu nhớt máy**: Thay mỗi **1.500 – 2.500 km** (nhớt bán tổng hợp) hoặc **2.500 – 3.500 km** (nhớt tổng hợp 100%).\n2. **Lọc gió & Bugi**: Kiểm tra vệ sinh mỗi **5.000 km**, thay mới định kỳ ở **10.000 – 12.000 km**.\n3. **Nhông sên dĩa / Dây curoa**: Tăng chỉnh, bôi trơn mỗi **500 km**; thay mới sau **18.000 – 20.000 km**.\n4. **Nước làm mát & Dầu phanh**: Xả e và thay mới sau mỗi **15.000 – 20.000 km**.',
    product: {
      product_id: 'PROD_ENG_011',
      name: 'Bugi NGK Laser Iridium CPR8EA-9 Chính Hãng',
      price: 260000,
      image_url: 'https://d1ksuy3hfmko20.cloudfront.net/images/bugi-ngk-iridium-real.jpg',
      stock: 90,
      category: 'Động cơ',
    },
  },
  {
    keywords: ['đèn yếu', 'đèn tối', 'đèn pha', 'bóng đèn', 'ắc quy', 'bình điện'],
    reply:
      '### Chẩn đoán hệ thống chiếu sáng & nguồn điện\n\nĐèn pha xe máy sáng yếu hoặc chập chờn theo ga thường do 1 trong 3 nguyên nhân:\n1. **Bóng Halogen nguyên bản đã già dây tóc** hoặc chóa đèn bị ố mờ sau thời gian dài sử dụng.\n2. **Bình ắc quy yếu điện** (điện áp tĩnh dưới 12.2V) hoặc sạc chỉnh lưu nạp không đủ dòng.\n\n**Giải pháp nâng cấp:**\n- Thay bóng **LED Philips Ultinon Pro6000** chuẩn chân zin giúp tăng cường độ sáng gấp 2.5 lần, gom sáng chuẩn không gây chói mắt và tiết kiệm điện năng cho bình ắc quy.',
    product: {
      product_id: 'PROD_ELC_011',
      name: 'Bóng đèn pha LED Philips Ultinon Pro6000 H4/HS1',
      price: 680000,
      image_url: 'https://d1ksuy3hfmko20.cloudfront.net/images/den-led-philips-real.jpg',
      stock: 40,
      category: 'Điện - Đèn',
    },
  },
  {
    keywords: ['phuộc', 'giảm xóc', 'sóc', 'êm', 'nhún'],
    reply:
      '### Tư vấn nâng cấp giảm xóc & phuộc sau\n\nNếu phuộc sau nguyên bản bị sàng lắc khi vào cua hoặc kịch hành trình khi chở hai người, bạn có thể nâng cấp lên dòng **Phuộc bình dầu YSS G-Series** có tích hợp vòng tăng chỉnh lò xo (Preload) để tùy biến theo tải trọng thực tế.',
    product: {
      product_id: 'PROD_SUS_010',
      name: 'Phuộc sau YSS G-Series bình dầu chính hãng',
      price: 2450000,
      image_url: 'https://d1ksuy3hfmko20.cloudfront.net/images/phuoc-yss-real.jpg',
      stock: 18,
      category: 'Hệ thống giảm xóc & Lái',
    },
  },
];

export function useWebSocketChat() {
  const { user } = useAuth();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);

  // Tạo hoặc lấy session_id ổn định
  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return 'USER#guest';
    if (user?.userId) return `USER#${user.userId}`;
    let guestId = window.localStorage.getItem('guest_chat_session_id');
    if (!guestId) {
      guestId = generateGuestId();
      window.localStorage.setItem('guest_chat_session_id', guestId);
    }
    return `USER#${guestId}`;
  }, [user?.userId]);

  // Khôi phục tin nhắn từ LocalStorage khi mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    const welcomeMsg: ChatMessage = {
      id: 'welcome-msg',
      role: 'model',
      content: WELCOME_CONTENT,
      timestamp: Date.now(),
    };
    setMessages([welcomeMsg]);
  }, []);

  // Lưu tin nhắn vào LocalStorage khi messages thay đổi
  useEffect(() => {
    if (messages.length > 0) {
      try {
        window.localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
      } catch {
        // ignore
      }
    }
  }, [messages]);

  // Đóng an toàn socket cũ mà KHÔNG kích hoạt sự kiện onclose dây chuyền
  const safelyCloseOldSocket = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      socketRef.current.onclose = null;
      try {
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
    }
  }, []);

  // Kết nối WebSocket
  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    safelyCloseOldSocket();

    try {
      setConnectionStatus('CONNECTING');
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('CONNECTED');
        reconnectAttemptsRef.current = 0;

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ action: 'ping' }));
            } catch {}
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        setIsThinking(false);
        try {
          const data = JSON.parse(event.data) as WebSocketResponse;
          if (data.response) {
            const aiMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              role: 'model',
              content: data.response,
              timestamp: Date.now(),
              embeddedProduct: data.product,
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        } catch {
          if (typeof event.data === 'string' && event.data.trim()) {
            const aiMsg: ChatMessage = {
              id: `msg-${Date.now()}`,
              role: 'model',
              content: event.data,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        }
      };

      ws.onerror = () => {
        // Để onclose quyết định trạng thái
      };

      ws.onclose = () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (isManuallyClosedRef.current) {
          setConnectionStatus('DISCONNECTED');
          return;
        }

        if (reconnectAttemptsRef.current >= 5) {
          setConnectionStatus('DISCONNECTED');
          return;
        }

        const backoffDelays = [3000, 5000, 8000, 12000, 15000];
        const delay = backoffDelays[reconnectAttemptsRef.current] || 15000;
        reconnectAttemptsRef.current += 1;

        setConnectionStatus('RECONNECTING');

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };
    } catch {
      setConnectionStatus('DISCONNECTED');
    }
  }, [safelyCloseOldSocket]);

  useEffect(() => {
    isManuallyClosedRef.current = false;
    connectWebSocket();

    return () => {
      isManuallyClosedRef.current = true;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      safelyCloseOldSocket();
    };
  }, [connectWebSocket, safelyCloseOldSocket]);

  // Gửi tin nhắn
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      // 1. Kiểm tra ưu tiên: Tra cứu thông tin/tiến độ đơn hàng
      try {
        const orderMarkdown = await checkOrderInChat(trimmed);
        if (orderMarkdown) {
          setIsThinking(false);
          const aiOrderMsg: ChatMessage = {
            id: `ai-order-${Date.now()}`,
            role: 'model',
            content: orderMarkdown,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiOrderMsg]);
          return;
        }
      } catch (err) {
        console.error('Lỗi check đơn hàng:', err);
      }

      // 2. Gửi qua WebSocket AI
      const payload: WebSocketPayload = {
        action: 'sendMessage',
        message: trimmed,
        session_id: getSessionId(),
      };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify(payload));
        } catch {
          // ignore
        }
      }

      // 3. Dự phòng thông minh nếu sau 2.2s socket chưa phản hồi
      const lower = trimmed.toLowerCase();
      const matched = KNOWLEDGE_BASE.find((k) =>
        k.keywords.some((kw) => lower.includes(kw)),
      );

      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        setIsThinking(false);
        if (matched) {
          const fallbackMsg: ChatMessage = {
            id: `ai-kb-${Date.now()}`,
            role: 'model',
            content: matched.reply,
            timestamp: Date.now(),
            embeddedProduct: matched.product,
          };
          setMessages((prev) => [...prev, fallbackMsg]);
        } else {
          const defaultReply: ChatMessage = {
            id: `ai-gen-${Date.now()}`,
            role: 'model',
            content: `Tôi đã ghi nhận yêu cầu tư vấn về **"${trimmed}"**.\n\nĐể tra cứu đúng mã phụ tùng chính hãng tương thích, bạn vui lòng cho biết thêm **dòng xe và đời xe** đang sử dụng (ví dụ: *Honda Winner X, Yamaha Exciter 155, Honda SH 150i, Wave Alpha...*) nhé!`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, defaultReply]);
        }
      }, 2200);
    },
    [getSessionId],
  );

  const clearChat = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIsThinking(false);
    const resetMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'model',
      content: WELCOME_CONTENT,
      timestamp: Date.now(),
    };
    setMessages([resetMsg]);
    try {
      window.localStorage.removeItem(STORAGE_CHAT_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    connectionStatus,
    messages,
    isThinking,
    sendMessage,
    clearChat,
    reconnect: connectWebSocket,
  };
}
