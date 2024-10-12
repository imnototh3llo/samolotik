import dotenv from 'dotenv';
import { Telegraf, session } from 'telegraf';
import { searchHandler, startHandler, textHandler } from './handlers/index.js';
import {
	airportFromHandler,
	airportToHandler,
	dateSelectionHandler,
	doneHandler,
	nextMonthHandler,
	prevMonthHandler,
} from './handlers/selectionHandlers.js';
import type { MyContext } from './types.js';
import logger from './utils/logger.js';

// Загрузка переменных окружения из файла .env
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
	// Если произошла ошибка при загрузке .env файла, логируем ошибку и завершаем процесс
	logger.error({ err: dotenvResult.error }, 'Error loading .env file ⚠️');
	process.exit(1);
}

// Проверка наличия BOT_TOKEN в переменных окружения
if (!process.env.BOT_TOKEN) {
	// Если BOT_TOKEN не найден, логируем ошибку и завершаем процесс
	logger.error('BOT_TOKEN not found in environment variables ⚠️');
	process.exit(1);
}

// Инициализация экземпляра бота с BOT_TOKEN из окружения
const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN);

// Использование middleware session для хранения данных сессии между взаимодействиями
bot.use(session());

// Регистрация обработчиков команд и действий
bot.start(startHandler); // Обработчик команды /start для приветствия пользователя и начала взаимодействия
bot.action('START_SEARCH', searchHandler); // Обработчик действия кнопки "START_SEARCH" для начала поиска
bot.on('text', textHandler); // Обработчик для любых текстовых сообщений от пользователя

// Регистрация обработчиков для различных действий выбора, таких как выбор аэропортов или дат
bot.action(/SELECT_FROM_(?<airportCode>[A-Z]{3})/, airportFromHandler); // Обработчик выбора аэропорта вылета, используя регулярное выражение для захвата кода аэропорта
bot.action(/SELECT_TO_(?<airportCode>[A-Z]{3})/, airportToHandler); // Обработчик выбора аэропорта назначения, используя регулярное выражение для захвата кода аэропорта
bot.action(/SELECT_DATE_(?<date>\d{4}-\d{2}-\d{2})/, dateSelectionHandler); // Обработчик выбора даты, используя регулярное выражение для захвата даты в формате YYYY-MM-DD
bot.action('DONE', doneHandler); // Обработчик действия завершения выбора
bot.action(/PREV_MONTH_(?<year>\d{4})_(?<month>\d{1,2})/, prevMonthHandler); // Обработчик выбора предыдущего месяца, используя регулярное выражение для захвата года и месяца
bot.action(/NEXT_MONTH_(?<year>\d{4})_(?<month>\d{1,2})/, nextMonthHandler); // Обработчик выбора следующего месяца, используя регулярное выражение для захвата года и месяца

/* eslint-disable promise/prefer-await-to-callbacks */
// Обработка и логирование ошибок, возникающих в боте
bot.catch(async (error, ctx) => {
	// Логирование ошибки с идентификатором обновления, если произошла ошибка при обработке обновления
	logger.error({ err: error, update_id: ctx.update.update_id }, 'An error occurred while processing the update ❌');
});
/* eslint-enable promise/prefer-await-to-callbacks */

// Функция для запуска бота
async function launchBot() {
	try {
		logger.info('Launching bot... 🚀');
		await bot.launch(); // Запуск бота
	} catch (error) {
		// Логирование ошибки, если бот не удалось запустить, и завершение процесса
		logger.error({ err: error }, 'Error launching the bot ❌');
		process.exit(1);
	}
}

// Запуск бота
void launchBot();
logger.info('Bot launched successfully! ✅');

// Обработчики корректного завершения работы для системных сигналов
process.once('SIGINT', () => {
	// Обработка сигнала SIGINT (например, при нажатии Ctrl+C), логирование и остановка бота
	logger.warn('Received SIGINT, stopping bot ✋');
	bot.stop();
	process.exit(0);
});

process.once('SIGTERM', () => {
	// Обработка сигнала SIGTERM (например, при завершении процесса), логирование и остановка бота
	logger.warn('Received SIGTERM, stopping bot ✋');
	bot.stop();
	process.exit(0);
});

// Обработка необработанных отклонений промисов и неперехваченных исключений, логирование их и завершение работы
process.on('unhandledRejection', (reason, promise) => {
	// Логирование необработанного отклонения промиса и завершение процесса
	logger.error({ promise, reason }, 'Unhandled promise rejection ⚠️');
	process.exit(1);
});

process.on('uncaughtException', (error) => {
	// Логирование неперехваченного исключения и завершение процесса
	logger.error({ err: error }, 'Unhandled exception ❌');
	process.exit(1);
});
