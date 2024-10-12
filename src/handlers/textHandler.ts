import type { Message, Update } from '@telegraf/types';
import type { NarrowedContext } from 'telegraf';
import { Markup } from 'telegraf';
import { getAirports } from '../services/getAirports.js';
import type { MyContext } from '../types.js';
import { generateCalendarMarkup } from '../utils/calendar.js';
import logger from '../utils/logger.js';

// Обработчик текстовых сообщений от пользователя
export const textHandler = async (ctx: NarrowedContext<MyContext, Update.MessageUpdate<Message.TextMessage>>) => {
	try {
		// Логируем начало обработки текстового сообщения
		logger.debug('Processing user text message');

		// Получаем текущий шаг процесса из сессии
		const step = ctx.session.step;

		// Если шаг - выбор города отправления
		if (step === 'from_city') {
			const city = ctx.message.text.trim(); // Получаем название города из сообщения пользователя
			if (!city) {
				// Если город не был указан, отправляем предупреждение
				logger.warn('City was not specified ❌');
				await ctx.reply('Пожалуйста, введите город отправления.');
				return;
			}

			logger.info(`Город отправления: ${city}`);

			try {
				// Запрашиваем список аэропортов для указанного города
				logger.debug(`Запрос списка аэропортов для города: ${city}`);
				const airports = await getAirports(city);
				if (!airports || airports.length === 0) {
					// Если аэропорты не найдены, уведомляем пользователя
					logger.warn('Аэропорты не найдены ❌');
					await ctx.reply('Аэропорты не найдены. Попробуйте ввести другой город.');
					return;
				}

				// Сохраняем город и список аэропортов в сессию и переходим к следующему шагу
				ctx.session = {
					...ctx.session,
					fromCity: city,
					airportsFrom: airports,
					step: 'from_airport_selection',
				};

				// Предлагаем пользователю выбрать аэропорт отправления, отправляя кнопки с названиями аэропортов
				logger.debug('Предлагаем пользователю выбрать аэропорт отправления');
				const airportButtons = airports.map((airport) => [airport.name]);
				await ctx.reply('Выберите аэропорт отправления:', Markup.keyboard(airportButtons).oneTime().resize());
			} catch (error) {
				// Логируем ошибку при получении списка аэропортов
				logger.error('Ошибка при получении списка аэропортов:', error);
				await ctx.reply('Произошла ошибка при поиске аэропортов. Пожалуйста, попробуйте снова позже.');
			}
		} else if (step === 'from_airport_selection') {
			// Если шаг - выбор аэропорта отправления
			const selectedAirportName = ctx.message.text.trim(); // Получаем название выбранного аэропорта из сообщения пользователя
			const airport = ctx.session.airportsFrom?.find((a) => a.name === selectedAirportName); // Ищем аэропорт по имени в списке аэропортов

			if (!airport) {
				// Если выбранного аэропорта нет в списке, уведомляем пользователя
				await ctx.reply('Пожалуйста, выберите аэропорт из предложенных вариантов.');
				return;
			}

			// Сохраняем выбранный аэропорт и переходим к следующему шагу - выбор города прибытия
			ctx.session = {
				...ctx.session,
				fromAirport: airport.code,
				step: 'to_city',
			};

			await ctx.reply('Введите город прибытия:', Markup.removeKeyboard()); // Убираем клавиатуру и запрашиваем город прибытия
		} else if (step === 'to_city') {
			// Если шаг - выбор города прибытия
			const city = ctx.message.text.trim(); // Получаем название города из сообщения пользователя
			if (!city) {
				// Если город не был указан, отправляем предупреждение
				logger.warn('Город не был указан ❌');
				await ctx.reply('Пожалуйста, введите город прибытия.');
				return;
			}

			logger.info(`Город прибытия: ${city}`);

			try {
				// Запрашиваем список аэропортов для указанного города
				logger.debug(`Запрос списка аэропортов для города: ${city}`);
				const airports = await getAirports(city);
				if (!airports || airports.length === 0) {
					// Если аэропорты не найдены, уведомляем пользователя
					logger.warn('Аэропорты не найдены ❌');
					await ctx.reply('Аэропорты не найдены. Попробуйте ввести другой город.');
					return;
				}

				// Сохраняем город и список аэропортов в сессию и переходим к следующему шагу
				ctx.session = {
					...ctx.session,
					toCity: city,
					airportsTo: airports,
					step: 'to_airport_selection',
				};

				// Предлагаем пользователю выбрать аэропорт прибытия, отправляя кнопки с названиями аэропортов
				logger.debug('Предлагаем пользователю выбрать аэропорт прибытия');
				const airportButtons = airports.map((airport) => [airport.name]);
				await ctx.reply('Выберите аэропорт прибытия:', Markup.keyboard(airportButtons).oneTime().resize());
			} catch (error) {
				// Логируем ошибку при получении списка аэропортов
				logger.error('Ошибка при получении списка аэропортов:', error);
				await ctx.reply('Произошла ошибка при поиске аэропортов. Пожалуйста, попробуйте снова позже.');
			}
		} else if (step === 'to_airport_selection') {
			// Если шаг - выбор аэропорта прибытия
			const selectedAirportName = ctx.message.text.trim(); // Получаем название выбранного аэропорта из сообщения пользователя
			const airport = ctx.session.airportsTo?.find((a) => a.name === selectedAirportName); // Ищем аэропорт по имени в списке аэропортов

			if (!airport) {
				// Если выбранного аэропорта нет в списке, уведомляем пользователя
				await ctx.reply('Пожалуйста, выберите аэропорт из предложенных вариантов.');
				return;
			}

			// Сохраняем выбранный аэропорт и переходим к следующему шагу - выбор даты вылета
			ctx.session = {
				...ctx.session,
				toAirport: airport.code,
				step: 'select_date',
			};

			await ctx.reply('Теперь выберите дату вылета:', Markup.removeKeyboard()); // Убираем клавиатуру и предлагаем выбрать дату вылета

			// Генерируем разметку календаря для выбора даты
			const calendarMarkup = generateCalendarMarkup(
				ctx.session.selectedDates ?? [],
				ctx.session.calendarYear ?? new Date().getFullYear(),
				ctx.session.calendarMonth ?? new Date().getMonth(),
			);

			// Отправляем пользователю разметку календаря
			await ctx.reply('Пожалуйста, выберите даты:', calendarMarkup);
		} else if (step === 'select_date') {
			// Если шаг - выбор даты вылета, но пользователь отправил текст, просим использовать календарь
			await ctx.reply('Пожалуйста, выберите даты, используя предоставленный календарь.');
		} else {
			// Если текущий шаг не определен, просим следовать инструкциям
			await ctx.reply('Пожалуйста, следуйте инструкциям бота.');
		}
	} catch (error) {
		// Логируем ошибку при обработке текстового сообщения
		logger.error('Ошибка при обработке текстового сообщения:', error);
		await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте снова.');
	}
};
