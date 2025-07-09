import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
    padding: 20px;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e0e0e0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-top: 20px;
    animation: ${fadeIn} 0.5s ease-out;
`;

const SummaryTitle = styled.h3`
    margin: 0 0 16px 0;
    color: #212529;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Text = styled.p`
    margin: 0;
    color: #495057;
    font-size: 15px;
    line-height: 1.6;
    white-space: pre-wrap;
    background-color: #f8f9fa;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #e9ecef;
`;

const StyledButton = styled.button`
    background-color: #6366f1;
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    margin-top: 20px;
    width: 100%;
    transition: background-color 0.3s ease, transform 0.1s ease;
    letter-spacing: 0.5px;
    
    &:hover:not(:disabled) {
        background-color: #4f46e5;
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
    }
    
    &:disabled {
        background-color: #ced4da;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
    }
`;

const ErrorText = styled.p`
    color: #dc3545;
    font-size: 13px;
    margin-top: 15px;
    padding: 10px 15px;
    background-color: #fdeded;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
    font-weight: 500;
`;

const LoadingSpinner = styled.div`
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 3px solid #ced4da;
    border-radius: 50%;
    border-top-color: #6366f1;
    animation: ${spin} 0.8s linear infinite;
    margin-right: 10px;
`;

export const Summary = () => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestSummary = async () => {
    setLoading(true);
    setError(null);
    setSummary('');

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url.includes('web.telegram.org')) {
            throw new Error('Пожалуйста, откройте страницу Telegram Web в активной вкладке');
        }

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
