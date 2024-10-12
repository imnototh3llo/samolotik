import type { Middleware } from 'telegraf';
import type { SessionData } from '../sessionData.js';
import type { MyContext } from '../types.js';
import logger from './logger.js';

// Хранилище сессий, используемое для хранения данных сессии по идентификатору чата
const sessionStore = new Map<number, SessionData>();

// Middleware для обработки сессий пользователей
export const sessionMiddleware: Middleware<MyContext> = async (ctx, next) => {
	// Получаем идентификатор чата из контекста
	const chatId = ctx.chat?.id;
	logger.debug('Chat ID:', chatId);

	// Если идентификатор чата не найден, логируем предупреждение и переходим к следующему middleware
	if (chatId === undefined) {
		logger.warn('Chat ID is undefined, proceeding to next middleware.');
		return next();
	}

	// Получаем данные сессии для текущего чата из хранилища, если они существуют,
	// либо создаем новые данные сессии с текущим годом и месяцем
	ctx.session = sessionStore.get(chatId) ?? {
		calendarYear: new Date().getFullYear(), // Устанавливаем текущий год для календаря
		calendarMonth: new Date().getMonth(), // Устанавливаем текущий месяц для календаря
	};
	logger.debug('Session data for chat:', ctx.session);

	// Выполняем следующую функцию middleware в цепочке
	await next();

	// Сохраняем обновленные данные сессии в хранилище
	sessionStore.set(chatId, ctx.session);
	logger.info('Updated session data saved for chat:', chatId, ctx.session);
};
