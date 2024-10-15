import dotenv from 'dotenv';
import type { Middleware } from 'telegraf';
import { Telegraf } from 'telegraf';
import { startHandler, searchHandler, textHandler } from './handlers/index.js';
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
import { sessionMiddleware } from './utils/sessionMiddleware.js';

/**
 * Загружает и валидирует необходимые переменные окружения.
 * Завершает процесс с ошибкой, если какие-либо обязательные переменные отсутствуют.
 */
function loadEnv(): void {
	const dotenvResult = dotenv.config();
	if (dotenvResult.error) {
		logger.error({ err: dotenvResult.error }, '[⚠️] Error loading .env file.');
		process.exit(1);
	}

	const requiredEnvVars = ['BOT_TOKEN', 'TRAVELPAYOUTS_AVIASALES'];
	const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

	if (missingVars.length > 0) {
		logger.error({ missingVars }, '[⚠️] Missing required environment variables.');
		process.exit(1);
	}
}

/**
 * Регистрирует обработчики действий с использованием регулярных выражений.
 *
 * @param bot - Экземпляр бота Telegraf.
 */
function registerActionHandlers(bot: Telegraf<MyContext>): void {
	bot.action('START_SEARCH', searchHandler);
	bot.on('text', textHandler);

	// Массив объектов, содержащих паттерны и соответствующие обработчики
	const actionHandlers: { handler: Middleware<MyContext>; pattern: RegExp }[] = [
		{ pattern: /SELECT_FROM_(?<airportCode>[A-Z]{3})/, handler: airportFromHandler },
		{ pattern: /SELECT_TO_(?<airportCode>[A-Z]{3})/, handler: airportToHandler },
		{ pattern: /SELECT_DATE_(?<date>\d{4}-\d{2}-\d{2})/, handler: dateSelectionHandler },
		{ pattern: /PREV_MONTH_(?<year>\d{4})_(?<month>\d{1,2})/, handler: prevMonthHandler },
		{ pattern: /NEXT_MONTH_(?<year>\d{4})_(?<month>\d{1,2})/, handler: nextMonthHandler },
	];

	for (const { pattern, handler } of actionHandlers) {
		bot.action(pattern, handler);
	}

	// Обработчик завершения выбора
	bot.action('DONE', doneHandler);
}

/**
 * Настраивает глобальные обработчики ошибок и системные сигналы.
 *
 * @param bot - Экземпляр бота Telegraf.
 */
function setupGlobalErrorHandlers(bot: Telegraf<MyContext>): void {
	/**
	 * Обрабатывает ошибки, возникающие в Telegraf.
	 *
	 * @param error - Ошибка, возникшая при обработке обновления.
	 * @param ctx - Контекст обновления.
	 */
	/* eslint-disable promise/prefer-await-to-then */
	/* eslint-disable promise/prefer-await-to-callbacks */
	bot.catch(async (error, ctx) => {
		logger.error(
			{ err: error, update_id: ctx.update.update_id },
			'[❌] An error occurred while processing the update.',
		);
	});

	/* eslint-disable promise/prefer-await-to-callbacks */

	/**
	 * Функция для корректного завершения работы бота при получении системных сигналов.
	 *
	 * @param signal - Название системного сигнала.
	 * @returns Функция-обработчик сигнала.
	 */
	function gracefulShutdown(signal: string): () => void {
		return () => {
			logger.warn(`[✋] Received ${signal}, stopping bot.`);
			bot.stop();
			process.exit(0);
		};
	}

	process.once('SIGINT', gracefulShutdown('SIGINT'));
	process.once('SIGTERM', gracefulShutdown('SIGTERM'));

	// Обработка необработанных отклонений промисов
	process.on('unhandledRejection', (reason, promise) => {
		logger.error({ promise, reason }, '[⚠️] Unhandled promise rejection:');
		process.exit(1);
	});

	// Обработка неперехваченных исключений
	process.on('uncaughtException', (error) => {
		logger.error({ err: error }, '[❌] Unhandled exception:');
		process.exit(1);
	});
}

/**
 * Запускает бота и логирует процесс запуска.
 *
 * @param bot - Экземпляр бота Telegraf.
 */
async function launchBot(bot: Telegraf<MyContext>): Promise<void> {
	try {
		logger.info('[🚀] Launching bot...');
		await bot.launch();
	} catch (error) {
		logger.error({ err: error }, '[❌] Error launching the bot:');
		process.exit(1);
	}
}

/**
 * Основная функция инициализации бота.
 * Выполняет загрузку конфигурации, настройку middleware, регистрацию обработчиков и запуск бота.
 */
async function initializeBot(): Promise<void> {
	loadEnv();

	// Инициализация экземпляра бота с BOT_TOKEN из окружения
	const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN!);

	// Использование кастомного middleware для сессий
	bot.use(sessionMiddleware);

	// Регистрация обработчиков команд и действий
	bot.start(startHandler);
	registerActionHandlers(bot);

	// Настройка глобальных обработчиков ошибок и системных сигналов
	setupGlobalErrorHandlers(bot);

	// Запуск бота
	await launchBot(bot);
}

// Запуск инициализации бота с использованием IIFE
(async () => {
	await initializeBot();
})().catch((error) => {
	logger.error({ err: error }, '[❌] Failed to initialize the bot.');
	process.exit(1);
});

// Логируем успешный запуск бота
logger.info('[✅] Bot launched successfully!');
