import pino from 'pino';

// Проверяем, является ли текущая среда продакшеном
const isProduction = process.env.NODE_ENV === 'production';

// Инициализация логгера pino с учетом среды (production или development)
const logger = pino.default(
	{
		level: isProduction ? 'info' : 'debug', // Устанавливаем уровень логирования: 'info' для production, 'debug' для development
		base: {
			pid: false, // Отключаем логирование PID процесса для упрощения вывода
		},
		timestamp: pino.stdTimeFunctions.isoTime, // Используем ISO формат времени для временных меток
	},
	isProduction
		? undefined // Для production среды используем стандартный вывод pino
		: pino.transport({
				// Для development среды используем pino-pretty для более удобного формата вывода
				target: 'pino-pretty',
				options: {
					colorize: true, // Включаем цветной вывод для удобства чтения логов
					translateTime: 'SYS:standard', // Переводим время в стандартный формат
					ignore: 'pid,hostname', // Игнорируем поля pid и hostname для сокращения вывода
				},
			}),
);

// Экспортируем логгер для использования в других частях приложения
export default logger;
