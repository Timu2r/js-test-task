import React, { useState, useEffect } from 'react';
import styled from 'styled-components'

const Container = styled.div`
	padding: 16px;
	background: #f8f9fa;
	border-radius: 8px;
	border-left: 4px solid #6366f1;
	margin-top: 15px;
`

const SummaryTitle = styled.h3`
	margin: 0 0 12px 0;
	color: #111827;
	font-size: 16px;
	font-weight: 600;
`

const Text = styled.p`
	margin: 0;
	color: #6b7280;
	font-size: 14px;
	line-height: 1.5;
	white-space: pre-wrap;
`

const StyledButton = styled.button`
	background-color: #007bff;
	color: white;
	padding: 10px 15px;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 14px;
	margin-top: 15px;
	width: 100%;
	transition: background-color 0.2s;
	
	&:hover:not(:disabled) {
		background-color: #0056b3;
	}
	
	&:disabled {
		background-color: #cccccc;
		cursor: not-allowed;
	}
`

const ErrorText = styled.p`
	color: #dc3545;
	font-size: 12px;
	margin-top: 10px;
	padding: 8px;
	background-color: #f8d7da;
	border: 1px solid #f5c6cb;
	border-radius: 4px;
`

const LoadingSpinner = styled.div`
	display: inline-block;
	width: 16px;
	height: 16px;
	border: 2px solid #6b7280;
	border-radius: 50%;
	border-top-color: transparent;
	animation: spin 1s linear infinite;
	margin-right: 8px;
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
`

export const Summary = () => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestSummary = async () => {
    setLoading(true);
    setError(null);
    setSummary('');

    try {
        // Шаг 1: Получаем сообщения из активной вкладки через content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url.includes('web.telegram.org')) {
            throw new Error('Пожалуйста, откройте страницу Telegram Web в активной вкладке');
        }

        // Шаг 2: Отправляем запрос в content script для получения сообщений
        const messagesResponse = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: "getChatMessages" }, (response) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message || 'Не удалось связаться с content script'));
                }
                resolve(response);
            });
        });

        if (!messagesResponse || !messagesResponse.success) {
            throw new Error(messagesResponse?.error || 'Не удалось получить сообщения из чата');
        }

        if (!messagesResponse.messages || messagesResponse.messages.length === 0) {
            throw new Error('Чат пуст или не содержит сообщений для анализа');
        }

        console.log('Получены сообщения:', messagesResponse.messages.length);

        // Шаг 3: Отправляем сообщения в background script для генерации резюме
        const summaryResponse = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "summarizeChatMessages",
                chatMessages: messagesResponse.messages.join('\n')
            }, (response) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message || 'Ошибка при генерации резюме'));
                }
                resolve(response);
            });
        });

        if (summaryResponse.success && summaryResponse.summary) {
            setSummary(summaryResponse.summary);
        } else if (summaryResponse.error) {
            throw new Error(summaryResponse.error);
        } else {
            throw new Error('Не удалось получить резюме от OpenAI API');
        }

    } catch (err) {
        console.error("Произошла ошибка при запросе резюме:", err);
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  // Функция для проверки статуса API
  const checkAPIStatus = async () => {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getAPIStatus" }, resolve);
      });
      
      if (!response.apiConfigured) {
        setError('OpenAI API ключ не настроен. Пожалуйста, настройте API ключ в background.js');
      }
    } catch (err) {
      console.error('Ошибка проверки API:', err);
    }
  };

  useEffect(() => {
    // Проверяем статус API при загрузке компонента
    checkAPIStatus();

    const handleMessage = (request, sender, sendResponse) => {
      if (request.action === "chatChanged") {
        console.log('Смена чата обнаружена, обновляем резюме...');
        requestSummary(); 
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  return (
    <Container>
      <SummaryTitle>Резюме чата</SummaryTitle>
      
      {loading && (
        <Text>
          <LoadingSpinner />
          Генерация резюме... Пожалуйста, подождите.
        </Text>
      )}
      
      {error && <ErrorText>{error}</ErrorText>}
      
      {summary ? (
        <Text>{summary}</Text>
      ) : (
        !loading && (
          <Text>
            Нажмите кнопку ниже, чтобы сгенерировать резюме последних сообщений из текущего чата.
          </Text>
        )
      )}
      
      <StyledButton onClick={requestSummary} disabled={loading}>
        {loading ? 'Обработка...' : 'Сгенерировать резюме'}
      </StyledButton>
    </Container>
  );
};