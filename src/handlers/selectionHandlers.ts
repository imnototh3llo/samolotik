import type { MiddlewareFn } from 'telegraf';
import { Markup } from 'telegraf';
import { getAirports } from '../services/getAirports.js';
import { trackFlights } from '../services/trackFlights.js';
import type { MyContext } from '../types.js';
import { generateCalendarMarkup } from '../utils/calendar.js';
import logger from '../utils/logger.js';

// Обработчик для выбора аэропорта вылета
export const airportFromHandler: MiddlewareFn<MyContext> = async (ctx) => {
	try {
		// Проверяем, что сообщение присутствует и содержит текст
		if (!ctx.message || !('text' in ctx.message)) {
			await ctx.reply('Пожалуйста, введите город отправления.');
			return;
		}

		// Получаем город из сообщения пользователя
		const city = ctx.message.text;
		logger.info(`Departure city: ${city} ✈️`);

		// Запрашиваем аэропорты для указанного города
		const airports = await getAirports(city);

		// Если аэропорты не найдены, уведомляем пользователя
		if (airports.length === 0) {
			await ctx.reply('Аэропорты не найдены для указанного города. Попробуйте снова.');
			return;
		}

		// Сохраняем найденные аэропорты в сессию и обновляем шаг процесса
		ctx.session = {
			...ctx.session,
			airportsFrom: airports,
			step: 'from_airport_selection',
		};

		// Создаем кнопки для выбора аэропорта и отправляем их пользователю
		const airportButtons = airports.map((airport) => [airport.name]);
		await ctx.reply('Выберите аэропорт отправления:', Markup.keyboard(airportButtons).oneTime().resize());
	} catch (error) {
		// Логируем ошибку и уведомляем пользователя
		logger.error('Error handling departure airport selection ❌', error);
		await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте снова.');
	}
};

// Обработчик для выбора аэропорта прибытия
export const airportToHandler: MiddlewareFn<MyContext> = async (ctx) => {
	try {
		// Проверяем, что сообщение присутствует и содержит текст
		if (!ctx.message || !('text' in ctx.message)) {
			await ctx.reply('Пожалуйста, введите город прибытия.');
			return;
		}

		// Получаем город из сообщения пользователя
		const city = ctx.message.text;
		logger.info(`Arrival city: ${city} 🛬`);

		// Запрашиваем аэропорты для указанного города
		const airports = await getAirports(city);

		// Если аэропорты не найдены, уведомляем пользователя
		if (airports.length === 0) {
			await ctx.reply('Аэропорты не найдены для указанного города. Попробуйте снова.');
			return;
		}

		// Сохраняем найденные аэропорты в сессию и обновляем шаг процесса
		ctx.session = {
			...ctx.session,
			airportsTo: airports,
			step: 'to_airport_selection',
		};

		// Создаем кнопки для выбора аэропорта и отправляем их пользователю
		const airportButtons = airports.map((airport) => [airport.name]);
		await ctx.reply('Выберите аэропорт прибытия:', Markup.keyboard(airportButtons).oneTime().resize());
	} catch (error) {
		// Логируем ошибку и уведомляем пользователя
		logger.error('Error handling arrival airport selection ❌', error);
		await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте снова.');
	}
};

// Обработчик для выбора даты вылета
export const dateSelectionHandler: MiddlewareFn<MyContext> = async (ctx) => {
	try {
		// Проверяем, что регулярное выражение успешно сопоставилось с датой
		if (!ctx.match?.groups?.date) {
			await ctx.reply('Не удалось определить выбранную дату.');
			return;
		}

		// Получаем выбранную дату из группы регулярного выражения
		const date = ctx.match.groups.date;
		logger.info(`Selected departure date: ${date} 📅`);

		// Получаем уже выбранные даты из сессии (или пустой массив, если их нет)
		const selectedDates = ctx.session.selectedDates ?? [];

		// Проверяем, была ли дата уже выбрана, и удаляем её, если да
		if (selectedDates.includes(date)) {
			logger.info(`Date already selected, removing: ${date} 🗑️`);
			const updatedDates = selectedDates.filter((selectedDate: string) => selectedDate !== date);

			ctx.session = {
				...ctx.session,
				selectedDates: updatedDates,
			};
		} else {
			// Если дата не была выбрана, добавляем её в список выбранных дат
			logger.info(`Adding selected date: ${date} ➕`);
			const updatedDates = [...selectedDates, date];

			ctx.session = {
				...ctx.session,
				selectedDates: updatedDates,
			};
		}

		// Обновляем разметку календаря с учетом выбранных дат
		await ctx.editMessageReplyMarkup(
			generateCalendarMarkup(
				ctx.session.selectedDates ?? [],
				ctx.session.calendarYear ?? new Date().getFullYear(),
				ctx.session.calendarMonth ?? new Date().getMonth(),
			).reply_markup,
		);
	} catch (error: any) {
		// Логируем ошибку и уведомляем пользователя
		logger.error('Error selecting departure date ❌', error);
		if (error.code === 400) {
			await ctx.reply('Не удалось обновить календарь. Пожалуйста, попробуйте снова.');
		}
	}
};

// Обработчик для завершения выбора
export const doneHandler: MiddlewareFn<MyContext> = async (ctx) => {
	try {
		logger.info('"Done" button pressed ✅');

		// Проверяем, были ли выбраны даты
		if (!ctx.session.selectedDates || ctx.session.selectedDates.length === 0) {
			await ctx.reply('Вы не выбрали ни одной даты. Пожалуйста, выберите хотя бы одну дату.');
			return;
		}

		// Проверяем, выбраны ли аэропорты отправления и прибытия
		if (!ctx.session.fromAirport || !ctx.session.toAirport) {
			logger.error('fromAirport or toAirport missing in session ⚠️');
			await ctx.reply('Информация об аэропортах отправления и прибытия отсутствует. Пожалуйста, начните поиск заново.');
			return;
		}

		logger.debug('Starting ticket search 🔍');

		// Выполняем поиск билетов для каждой выбранной даты
		for (const date of ctx.session.selectedDates) {
			const result = await trackFlights(ctx.session.fromAirport, ctx.session.toAirport, date);
			await ctx.reply(`Результаты поиска на ${date}:
${result}`);
		}

		// Обновляем данные сессии после завершения поиска
		ctx.session = {
			...ctx.session,
			step: 'completed',
			selectedDates: [],
			calendarYear: new Date().getFullYear(),
			calendarMonth: new Date().getMonth(),
		};

		logger.debug('Search completed ✅');
	} catch (error) {
		// Логируем ошибку и уведомляем пользователя
		logger.error('Error handling "Done" button press ❌', error);
		await ctx.reply('Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте снова.');
	}
};

// Обработчик для перехода к предыдущему месяцу в календаре
export const prevMonthHandler: MiddlewareFn<MyContext> = async (ctx) => {
	try {
		// Вычисляем предыдущий месяц и обновляем год, если необходимо
		const calendarMonth = ctx.session.calendarMonth === 0 ? 11 : (ctx.session.calendarMonth ?? 1) - 1;
		const calendarYear =
			ctx.session.calendarMonth === 0
				? (ctx.session.calendarYear ?? new Date().getFullYear()) - 1
				: (ctx.session.calendarYear ?? new Date().getFullYear());

		// Сохраняем обновленный месяц и год в сессии
		ctx.session = {
			...ctx.session,
			calendarMonth,
			calendarYear,
		};

		// Обновляем разметку календаря с учетом нового месяца и года
		await ctx.editMessageReplyMarkup(
			generateCalendarMarkup(ctx.session.selectedDates ?? [], calendarYear, calendarMonth).reply_markup,
		);
	} catch (error) {
		// Логируем ошибку, если не удалось перейти к предыдущему месяцу
		logger.error('Error moving to previous month ❌', error);
	}
};

// Обработчик для перехода к следующему месяцу в календаре
export const nextMonthHandler: MiddlewareFn<MyContext> = async (ctx) => {
	try {
		// Проверяем, что регулярное выражение успешно сопоставилось с годом и месяцем
		if (!ctx.match?.groups) {
			await ctx.reply('Произошла ошибка: не удалось обработать ваш запрос.');
			return;
		}

		// Получаем год и месяц из группы регулярного выражения
		const year = Number.parseInt(ctx.match.groups.year, 10);
		const month = Number.parseInt(ctx.match.groups.month, 10);

		// Вычисляем следующий месяц и обновляем год, если необходимо
		const calendarMonth = month === 11 ? 0 : month + 1;
		const calendarYear = month === 11 ? year + 1 : year;

		// Сохраняем обновленный месяц и год в сессии
		ctx.session = {
			...ctx.session,
			calendarMonth,
			calendarYear,
		};

		// Обновляем разметку календаря с учетом нового месяца и года
		await ctx.editMessageReplyMarkup(
			generateCalendarMarkup(ctx.session.selectedDates ?? [], calendarYear, calendarMonth).reply_markup,
		);
	} catch (error) {
		// Логируем ошибку и уведомляем пользователя
		logger.error('Error moving to next month ❌', error);
		await ctx.reply('Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте снова.');
	}
};
