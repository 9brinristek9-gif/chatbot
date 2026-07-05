// ==========================================
// WARAS - Frontend Chat Widget & UX Logic
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Select DOM Elements
  const chatBubbleToggle = document.getElementById('chat-bubble-toggle');
  const chatWindow = document.getElementById('chat-window');
  const chatCloseBtn = document.getElementById('chat-close-btn');
  const chatForm = document.getElementById('chat-widget-form');
  const chatInput = document.getElementById('chat-widget-input');
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const chatNotificationBadge = document.getElementById('chat-notification-badge');
  const chatTypingIndicator = document.getElementById('chat-typing-indicator');
  
  // CTA buttons on the page that should trigger the chat
  const btnStartConsultation = document.getElementById('btn-start-consultation');
  const heroBtnPrimary = document.getElementById('hero-btn-primary');
  const ctaBtnStart = document.getElementById('cta-btn-start');

  // Icons inside FAB
  const iconChatOpen = chatBubbleToggle.querySelector('.icon-chat-open');
  const iconChatClose = chatBubbleToggle.querySelector('.icon-chat-close');

  // Conversation history array for the Gemini API
  let conversationHistory = [];

  // API URL - relative path since page is served from the same server (port 3000)
  // JANGAN buka index.html langsung dari file explorer! Buka via http://localhost:3000/
  const API_URL = '/api/chat';
  console.log('%c🧠 WARAS Chat siap digunakan!', 'font-size:18px; font-weight:bold; color:#0d9488;');
  console.log(`📡 API Endpoint: http://localhost:3000${API_URL}`);

  // Toggle Chat Window function
  const toggleChat = (forceState = null) => {
    const isHidden = chatWindow.classList.contains('hidden');
    const shouldOpen = forceState !== null ? forceState : isHidden;

    if (shouldOpen) {
      // Open Chat
      chatWindow.classList.remove('hidden');
      chatWindow.classList.remove('closing');
      iconChatOpen.classList.add('hidden');
      iconChatClose.classList.remove('hidden');
      
      // Hide notification badge when opened
      chatNotificationBadge.classList.add('hidden');
      
      // Focus on input field
      setTimeout(() => {
        chatInput.focus();
      }, 300);
    } else {
      // Close Chat with soft animation
      chatWindow.classList.add('closing');
      
      // Wait for closing animation before adding hidden class
      setTimeout(() => {
        chatWindow.classList.add('hidden');
        chatWindow.classList.remove('closing');
        iconChatOpen.classList.remove('hidden');
        iconChatClose.classList.add('hidden');
      }, 300);
    }
  };

  // Event Listeners for Opening/Closing Chat
  chatBubbleToggle.addEventListener('click', () => toggleChat());
  chatCloseBtn.addEventListener('click', () => toggleChat(false));

  // Connect landing page CTA buttons to the chat bubble
  const connectCtaToChat = (buttonEl) => {
    if (buttonEl) {
      buttonEl.addEventListener('click', (e) => {
        e.preventDefault();
        toggleChat(true);
      });
    }
  };
  connectCtaToChat(btnStartConsultation);
  connectCtaToChat(heroBtnPrimary);
  connectCtaToChat(ctaBtnStart);

  // Helper function to format timestamp
  const getFormattedTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}.${minutes}`;
  };

  // Helper to scroll the chat box to bottom
  const scrollToBottom = () => {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  };

  // Helper function to append message elements
  const appendMessage = (sender, text) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-msg', sender === 'user' ? 'msg-sent' : 'msg-received');

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('msg-bubble');
    
    // Support markdown style breaklines
    bubbleDiv.innerHTML = text.replace(/\n/g, '<br>');
    
    const metaDiv = document.createElement('div');
    metaDiv.classList.add('msg-meta');
    metaDiv.textContent = getFormattedTime();

    messageDiv.appendChild(bubbleDiv);
    messageDiv.appendChild(metaDiv);

    // Insert before typing indicator
    chatMessagesContainer.insertBefore(messageDiv, chatTypingIndicator);
    scrollToBottom();

    return messageDiv;
  };

  // Form Submit handler
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userMessageText = chatInput.value.trim();
    if (!userMessageText) return;

    // 1. Add user message to UI
    appendMessage('user', userMessageText);
    chatInput.value = '';

    // 2. Add to conversation history
    conversationHistory.push({ role: 'user', text: userMessageText });

    // 3. Show typing indicator
    chatTypingIndicator.classList.remove('hidden');
    scrollToBottom();

    try {
      // 4. Post message to Server
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversation: conversationHistory })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // 5. Hide typing indicator
      chatTypingIndicator.classList.add('hidden');

      if (data && data.result) {
        // 6. Add assistant message to UI
        appendMessage('bot', data.result);
        
        // 7. Add response to history
        conversationHistory.push({ role: 'model', text: data.result });
      } else {
        throw new Error('Invalid response data from server');
      }

    } catch (error) {
      console.error('Failed to communicate with AI server:', error);
      
      // Hide typing indicator
      chatTypingIndicator.classList.add('hidden');
      
      // Show error message bubble
      appendMessage('bot', 'Maaf, saya sedang pusing 🥴 Coba ulang lagi besok ya!');
      
      // Pop last user message from history to prevent context pollution
      conversationHistory.pop();
    }
  });
});
