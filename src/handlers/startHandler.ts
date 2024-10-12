import { Markup } from 'telegraf';
import type { MyContext } from '../types.js';
import logger from '../utils/logger.js';

// Обработчик команды /start, который приветствует пользователя и предлагает начать поиск билетов
export const startHandler = async (ctx: MyContext) => {
	try {
		// Отправляем пользователю приветственное сообщение с кнопкой для начала поиска
		await ctx.reply('Привет! Я бот для отслеживания цен на авиабилеты. Нажмите кнопку ниже, чтобы начать поиск.', {
			reply_markup: Markup.inlineKeyboard([
				// Создаем разметку с кнопкой
				Markup.button.callback('Начать поиск', 'START_SEARCH'), // Кнопка с текстом "Начать поиск" и callback-данными "START_SEARCH"
			]).reply_markup,
		});
	} catch (error) {
		// Логируем ошибку, если не удалось отправить сообщение
		logger.error('[❌] Error sending welcome message:', error);
	}
};
