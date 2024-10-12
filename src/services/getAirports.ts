import axios from 'axios';
import dotenv from 'dotenv';
import Fuse from 'fuse.js';
import type { Airport } from '../types.js';
import logger from '../utils/logger.js';

// Загрузка переменных окружения из файла .env
dotenv.config();

// Функция для получения списка аэропортов по названию города
export async function getAirports(city: string): Promise<Airport[]> {
	logger.debug(`[✈️] Search for airports in the city: ${city}.`);

	// Получаем API-ключ из переменных окружения
	const apiKey = process.env.TRAVELPAYOUTS_AVIASALES;
	if (!apiKey) {
		// Если API-ключ отсутствует, логируем ошибку и возвращаем пустой массив
		logger.error('[⚠️] Aviasales API key not found in environment variables.');
		return [];
	}

	// URL для выполнения запроса к API автозаполнения Aviasales
	const url = 'https://autocomplete.travelpayouts.com/places2';

	// Параметры для запроса к API
	const params = {
		term: city, // Термин для поиска (название города)
		locale: 'ru', // Язык результатов
		types: 'city,airport', // Типы мест (город или аэропорт)
		token: apiKey, // Токен доступа к API
	};

	try {
		logger.debug('[🔍] Make a request to the API...');
		// Выполняем запрос к API
		const response = await axios.get(url, { params });

		// Проверяем, что статус ответа успешный (200 OK)
		if (response.status !== 200) {
			logger.error(`[❌] API request error: ${response.statusText}.`);
			return [];
		}

		// Получаем данные из ответа API
		const data = response.data;

		// Проверяем, что данные являются массивом и не пусты
		if (!Array.isArray(data) || data.length === 0) {
			logger.warn('[❌] No airports found.');
			return [];
		}

		logger.debug('[📦️] The data is retrieved from the API:', data);

		// Настройки для Fuse.js (библиотека для поиска по строкам)
		const fuseOptions = {
			keys: ['name', 'city_name', 'main_airport_name'], // Поля, по которым будет выполняться поиск
			threshold: 0.4, // Порог схожести для определения совпадений
			ignoreLocation: true, // Игнорировать положение совпадений в строке
			includeScore: true, // Включить оценку совпадений в результатах
		};

		// Создаем экземпляр Fuse для поиска по данным
		const fuse = new Fuse(data, fuseOptions);

		// Выполняем поиск аэропортов по названию города
		const searchResult = fuse.search(city);

		// Если совпадений не найдено, логируем предупреждение и возвращаем пустой массив
		if (searchResult.length === 0) {
			logger.warn('[❌] Airports not found with Fuse.js');
			return [];
		}

		// Извлекаем элементы, найденные Fuse.js
		const matchedItems = searchResult.map((result) => result.item);

		// Фильтруем результаты, оставляя только аэропорты или города с главным аэропортом, и создаем массив объектов Airport
		const airports: Airport[] = matchedItems
			.filter((item: any) => (item.type === 'airport' || (item.type === 'city' && item.main_airport_name)) && item.code) // Фильтрация по типу и наличию кода аэропорта
			.map((item: any) => ({
				name: item.type === 'airport' ? item.name : item.main_airport_name, // Используем имя аэропорта или главное имя аэропорта для города
				code: item.code, // Код аэропорта
			}));

		// Если после фильтрации не осталось аэропортов, логируем предупреждение и возвращаем пустой массив
		if (airports.length === 0) {
			logger.warn('[❌] No airports found after filtering.');
			return [];
		}

		// Логируем количество найденных аэропортов и возвращаем результат
		logger.info(`[✈️] Airports found: ${airports.length}.`);
		return airports;
	} catch (error) {
		// Обработка ошибок при запросе к API
		if (axios.isAxiosError(error)) {
			logger.error('[❌] API request error:', error.message);
		} else {
			logger.error('[❌] Unknown error:', error);
		}

		// В случае ошибки возвращаем пустой массив
		return [];
	}
}
