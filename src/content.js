// content.js - Скрипт для извлечения сообщений из Telegram Web

console.log('Grensa.AI Content Script загружен для Telegram Web');

// Функция для извлечения сообщений из чата
function extractChatMessages(limit = 50) {
    try {
        const messages = [];
        
        // Различные селекторы для сообщений в Telegram Web
        const messageSelectors = [
            '.Message',
            '.message',
            '[data-message-id]',
            '.chat-message',
            '.text-content'
        ];
        
        let messageElements = [];
        
        // Пробуем найти сообщения по разным селекторам
        for (const selector of messageSelectors) {
            messageElements = document.querySelectorAll(selector);
            if (messageElements.length > 0) {
                console.log(`Найдено ${messageElements.length} сообщений с селектором: ${selector}`);
                break;
            }
        }
        
        if (messageElements.length === 0) {
            console.warn('Не найдено сообщений с известными селекторами');
            return [];
        }
        
        // Берем последние сообщения (ограничиваем количество)
        const recentMessages = Array.from(messageElements).slice(-limit);
        
        recentMessages.forEach((element, index) => {
            try {
                let messageText = '';
                let author = '';
                let timestamp = '';
                
                // Пытаемся извлечь текст сообщения
                const textElement = element.querySelector('.text-content, .message-text, .text, .Message-text');
                if (textElement) {
                    messageText = textElement.textContent?.trim() || '';
                }
                
                // Если не найден текст, берем весь текст элемента
                if (!messageText) {
                    messageText = element.textContent?.trim() || '';
                }
                
                // Извлекаем автора сообщения
                const authorElement = element.querySelector('.message-author, .peer-title, .sender-name, .Message-author');
                if (authorElement) {
                    author = authorElement.textContent?.trim() || '';
                }
                
                // Извлекаем время отправки
                const timeElement = element.querySelector('.message-time, .time, .Message-time');
                if (timeElement) {
                    timestamp = timeElement.textContent?.trim() || '';
                }
                
                // Добавляем сообщение только если есть текст
                if (messageText && messageText.length > 0) {
                    const formattedMessage = author 
                        ? `${author}: ${messageText}` 
                        : messageText;
                    
                    messages.push(formattedMessage);
                }
                
            } catch (err) {
                console.error(`Ошибка при обработке сообщения ${index}:`, err);
            }
        });
        
        console.log(`Извлечено ${messages.length} сообщений из чата`);
        return messages;
        
    } catch (error) {
        console.error('Ошибка при извлечении сообщений:', error);
        return [];
    }
}

// Функция для получения названия текущего чата
function getCurrentChatTitle() {
    try {
        const titleSelectors = [
            '.chat-info-title',
            '.peer-title',
            '.chat-title',
            '.ChatInfo .title',
            'h1.chat-title'
        ];
        
        for (const selector of titleSelectors) {
            const titleElement = document.querySelector(selector);
            if (titleElement) {
                return titleElement.textContent?.trim() || 'Неизвестный чат';
            }
        }
        
        return 'Неизвестный чат';
    } catch (error) {
        console.error('Ошибка при получении названия чата:', error);
        return 'Неизвестный чат';
    }
}

// Функция для отслеживания смены чата
function setupChatChangeDetector() {
    let currentChatTitle = getCurrentChatTitle();
    let currentURL = window.location.href;
    
    // Отслеживаем изменения в URL
    const observer = new MutationObserver(() => {
        const newURL = window.location.href;
        const newChatTitle = getCurrentChatTitle();
        
        if (newURL !== currentURL || newChatTitle !== currentChatTitle) {
            console.log('Обнаружена смена чата:', newChatTitle);
            currentURL = newURL;
            currentChatTitle = newChatTitle;
            
            // Уведомляем расширение о смене чата
            chrome.runtime.sendMessage({ 
                action: "chatChanged", 
                chatTitle: newChatTitle,
                url: newURL
            });
        }
    });
    
    // Наблюдаем за изменениями в DOM
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
    
    // Также отслеживаем изменения в истории браузера
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            const newChatTitle = getCurrentChatTitle();
            if (newChatTitle !== currentChatTitle) {
                console.log('Смена чата через popstate:', newChatTitle);
                currentChatTitle = newChatTitle;
                chrome.runtime.sendMessage({ 
                    action: "chatChanged", 
                    chatTitle: newChatTitle,
                    url: window.location.href
                });
            }
        }, 500);
    });
}

// Слушатель сообщений от popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script получил сообщение:', request.action);
    
    if (request.action === "getChatMessages") {
        try {
            const messages = extractChatMessages(request.limit || 50);
            const chatTitle = getCurrentChatTitle();
            
            if (messages.length === 0) {
                sendResponse({
                    success: false,
                    error: 'Не удалось найти сообщения в текущем чате. Убедитесь, что вы находитесь в открытом чате Telegram.'
                });
                return;
            }
            
            sendResponse({
                success: true,
                messages: messages,
                chatTitle: chatTitle,
                messageCount: messages.length
            });
            
        } catch (error) {
            console.error('Ошибка при получении сообщений:', error);
            sendResponse({
                success: false,
                error: `Ошибка при извлечении сообщений: ${error.message}`
            });
        }
    }
    
    if (request.action === "getChatInfo") {
        try {
            const chatTitle = getCurrentChatTitle();
            const messageCount = document.querySelectorAll('.Message, .message').length;
            
            sendResponse({
                success: true,
                chatTitle: chatTitle,
                messageCount: messageCount,
                url: window.location.href
            });
            
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    
    return true; // Для асинхронного ответа
});

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupChatChangeDetector);
} else {
    setupChatChangeDetector();
}

// Уведомляем расширение о том, что content script готов
chrome.runtime.sendMessage({ 
    action: "contentScriptReady", 
    url: window.location.href 
});

console.log('Content script инициализирован для Telegram Web');