const GEMINI_API_KEY = 'AIzaSyB5XpHcUwtXqDAhXDHupKqJVQpjRZ3CP6Y';

async function callGeminiAPI(promptText) {
	console.log(
		'Попытка отправить запрос в Gemini AI с промптом:',
		promptText.substring(0, 100) + '...'
	)

	try {
		const response = await fetch(
			'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-goog-api-key': GEMINI_API_KEY,
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{
									text: promptText,
								},
							],
						},
					],
					generationConfig: {
						temperature: 0.7,
						maxOutputTokens: 300,
						topP: 0.8,
						topK: 40,
					},
				}),
			}
		)

		if (!response.ok) {
			const errorData = await response.json()
			console.error('Ошибка Gemini API (HTTP):', response.status, errorData)
			throw new Error(
				`API Error: ${response.status} - ${
					errorData.error?.message || JSON.stringify(errorData)
				}`
			)
		}

		const data = await response.json()

		if (
			data.candidates &&
			data.candidates.length > 0 &&
			data.candidates[0].content &&
			data.candidates[0].content.parts &&
			data.candidates[0].content.parts.length > 0
		) {
			const geminiResponseText = data.candidates[0].content.parts[0].text
			console.log('Успешный ответ от Gemini AI:', geminiResponseText)
			return geminiResponseText
		} else {
			console.warn('Gemini AI вернул неожиданный формат ответа:', data)
			throw new Error('Не удалось получить содержимое ответа от Gemini AI.')
		}
	} catch (error) {
		console.error('Произошла ошибка при выполнении запроса к Gemini AI:', error)
		throw error
	}
}

function validateAPIKey() {
	if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
		throw new Error(
			'Gemini API ключ не настроен. Пожалуйста, добавьте ваш API ключ в background.js'
		)
	}
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log('Получен запрос в background.js:', request.action)

	if (request.action === 'summarizeChatMessages') {
		console.log('Получен запрос на резюмирование чата от content.js/popup.js')

		try {
			validateAPIKey()

			const chatMessages = request.chatMessages
			if (!chatMessages || chatMessages.length === 0) {
				console.error('Нет сообщений для резюмирования.')
				sendResponse({
					success: false,
					error: 'Нет сообщений для резюмирования.',
				})
				return false
			}

			const prompt = `Пожалуйста, сделай краткое резюме следующих сообщений чата Telegram. 
                           Фокусируйся на ключевых темах, вопросах и решениях. Выдели основные моменты.
                           Резюме должно быть лаконичным, информативным и не превышать 200 слов.
                           Отвечай на русском языке.

Сообщения чата:
${chatMessages}`

			callGeminiAPI(prompt)
				.then(summary => {
					console.log(
						'Резюме успешно сгенерировано:',
						summary.substring(0, 100) + '...'
					)
					sendResponse({
						success: true,
						summary: summary,
					})
				})
				.catch(error => {
					console.error('Ошибка при генерации резюме:', error)
					sendResponse({
						success: false,
						error: error.message,
					})
				})

			return true
		} catch (error) {
			console.error('Ошибка валидации:', error)
			sendResponse({
				success: false,
				error: error.message,
			})
			return false
		}
	}

	if (request.action === 'generateSuggestedMessages') {
		console.log('Получен запрос на генерацию предлагаемых сообщений')

		try {
			validateAPIKey()

			const chatMessages = request.chatMessages
			if (!chatMessages || chatMessages.length === 0) {
				sendResponse({
					success: false,
					error: 'Нет сообщений для анализа.',
				})
				return false
			}

			const prompt = `На основе следующих сообщений чата Telegram, сгенерируй 3 варианта подходящих ответных сообщений.
                           Сообщения должны быть естественными, соответствовать контексту разговора и тону переписки.
                           Каждый вариант напиши с новой строки, начиная с номера.
                           Отвечай на том же языке, на котором ведется переписка.

Сообщения чата:
${chatMessages}`

			callGeminiAPI(prompt)
				.then(suggestions => {
					console.log('Предлагаемые сообщения сгенерированы:', suggestions)
					const suggestionsArray = suggestions
						.split('\n')
						.filter(line => line.trim().length > 0)
						.map(line => line.replace(/^\d+\.\s*/, '').trim())
						.filter(line => line.length > 0)

					sendResponse({
						success: true,
						suggestions: suggestionsArray,
					})
				})
				.catch(error => {
					console.error('Ошибка при генерации предлагаемых сообщений:', error)
					sendResponse({
						success: false,
						error: error.message,
					})
				})

			return true
		} catch (error) {
			sendResponse({
				success: false,
				error: error.message,
			})
			return false
		}
	}

	if (request.action === 'testGemini') {
		console.log('Запуск тестового запроса к Gemini API')

		try {
			validateAPIKey()

			callGeminiAPI(
				'Объясни, как работает искусственный интеллект, в двух предложениях.'
			)
				.then(response => {
					console.log('Тестовый запрос успешен:', response)
					sendResponse({
						success: true,
						data: response,
					})
				})
				.catch(error => {
					console.error('Ошибка тестового запроса:', error)
					sendResponse({
						success: false,
						error: error.message,
					})
				})

			return true
		} catch (error) {
			sendResponse({
				success: false,
				error: error.message,
			})
			return false
		}
	}

	if (request.action === 'getAPIStatus') {
		const isConfigured =
			GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE'
		sendResponse({
			success: true,
			apiConfigured: isConfigured,
			apiType: 'Gemini',
			message: isConfigured
				? 'Gemini API ключ настроен'
				: 'Gemini API ключ не настроен',
		})
		return false
	}

	console.warn('Неизвестное действие:', request.action)
	sendResponse({
		success: false,
		error: 'Неизвестное действие: ' + request.action,
	})
	return false
})

chrome.runtime.onInstalled.addListener(() => {
	console.log('Расширение Grensa.AI для Telegram установлено')
})

chrome.runtime.onStartup.addListener(() => {
	console.log('Расширение Grensa.AI для Telegram запущено')
})