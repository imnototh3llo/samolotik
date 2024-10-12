import axios from 'axios';
import type { Flight } from '../types.js';
import logger from '../utils/logger.js';

// Функция для отслеживания доступных билетов на авиарейсы
export const trackFlights = async (from: string, to: string, date: string): Promise<string> => {
	// Логируем информацию о запросе на отслеживание билетов
	logger.info(`[✈️] Tracking tickets from ${from} to ${to} on date ${date}.`);

	try {
		// Проверяем, что входные данные корректны
		if (!from || !to || !date) {
			logger.error('[❌] Incorrect input data.')
		}

		// Получаем API-ключ из переменных окружения
		const apiKey = process.env.TRAVELPAYOUTS_AVIASALES;
		if (!apiKey) {
			logger.error('[⚠️] Aviasales API key not found in environment variables.');
		}

		// Проверяем, что дата передана в корректном формате
		const dateObj = new Date(date);
		if (Number.isNaN(dateObj.getTime())) {
			logger.error('[❌] Incorrect date format.');
		}

		// Форматируем дату для использования в запросе
		const formattedDate = dateObj.toISOString().split('T')[0];

		// URL для запроса к API Aviasales
		const url = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';

		// Параметры для запроса к API
		const params = {
			origin: from, // Код аэропорта отправления
			destination: to, // Код аэропорта назначения
			currency: 'rub', // Валюта для отображения цен
			departure_at: formattedDate, // Дата вылета в формате YYYY-MM-DD
			sorting: 'price', // Сортировка по цене
			direct: true, // Только прямые рейсы
			limit: 10, // Лимит на количество возвращаемых результатов
			token: apiKey, // Токен для доступа к API
		};

		// Логируем URL запроса и параметры
		logger.debug(`[🌐] API request URL: ${url}`);
		logger.debug('[🌐] Request parameters:', params);

		// Выполняем GET-запрос к API
		const response = await axios.get(url, { params });

		// Проверяем статус ответа, если он не 200 - выбрасываем ошибку
		if (response.status !== 200) {
			logger.error(`[❌] Error during API request: ${response.statusText}.`);
		}

		// Получаем данные из ответа API
		const data = response.data;

		// Проверяем, что в данных есть информация о рейсах
		if (!data.data || data.data.length === 0) {
			logger.warn('[❌] Tickets not found.');
			return 'Не удалось найти билеты на указанное направление.';
		}

		// Преобразуем данные в массив объектов Flight
		const flights: Flight[] = data.data.map((flight: any) => ({
			price: flight.price, // Цена билета
			airline: flight.airline, // Авиакомпания
			date: flight.departure_at.split('T')[0], // Дата вылета
			flight_number: flight.flight_number, // Номер рейса
			departure_at: flight.departure_at, // Время вылета
			return_at: flight.return_at, // Время обратного рейса (если есть)
		}));

		// Находим самый дешевый рейс из списка
		const cheapestFlight = flights.reduce((prev, curr) => (curr.price < prev.price ? curr : prev));

		// Логируем информацию о самом дешевом билете
		logger.info(`[💸] Cheapest ticket: ${cheapestFlight.price} RUB, Airline: ${cheapestFlight.airline}.`);

		// Возвращаем информацию о самом дешевом билете
		return `Самый дешевый билет: ${cheapestFlight.price} руб.
Авиакомпания: ${cheapestFlight.airline}
Рейс: ${cheapestFlight.flight_number}
Дата вылета: ${cheapestFlight.departure_at}`;
	} catch (error: unknown) {
		// Обработка ошибок при выполнении запроса
		if (axios.isAxiosError(error)) {
			// Логируем ошибку, если она связана с запросом к API
			logger.error('[❌] Error during API request:', error.message);
		} else if (error instanceof Error) {
			// Логируем общую ошибку
			logger.error('[❌] Error fetching ticket data:', error.message);
		} else {
			// Логируем неизвестную ошибку
			logger.error('[❓] Unknown error:', error);
		}

		// Возвращаем сообщение об ошибке пользователю
		return 'Не удалось получить данные о билетах. Попробуйте позже.';
	}
};
