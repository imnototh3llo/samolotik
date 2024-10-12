import { Markup } from 'telegraf';
import type { InlineKeyboardButton, InlineKeyboardMarkup } from 'typegram';
import logger from './logger.js';

// Функция для генерации разметки календаря с кнопками для выбора дат
export function generateCalendarMarkup(
	selectedDates: string[], // Список выбранных дат в формате YYYY-MM-DD
	year: number, // Год, для которого создается календарь
	month: number, // Месяц (0 - январь, 11 - декабрь)
): Markup.Markup<InlineKeyboardMarkup> {
	logger.debug('Generating calendar for date selection 🗓️');

	// Массив для хранения кнопок календаря
	const buttons: InlineKeyboardButton[][] = [];

	// Названия месяцев для отображения пользователю
	const monthNames = [
		'Январь',
		'Февраль',
		'Март',
		'Апрель',
		'Май',
		'Июнь',
		'Июль',
		'Август',
		'Сентябрь',
		'Октябрь',
		'Ноябрь',
		'Декабрь',
	];
	const monthName = monthNames[month];

	// Добавляем заголовок с кнопками для переключения месяца
	buttons.push([
		Markup.button.callback('<<', `PREV_MONTH_${year}_${month}`), // Кнопка для перехода к предыдущему месяцу
		Markup.button.callback(`${monthName} ${year}`, 'IGNORE'), // Отображаем текущий месяц и год, кнопка неактивна
		Markup.button.callback('>>', `NEXT_MONTH_${year}_${month}`), // Кнопка для перехода к следующему месяцу
	]);

	// Добавляем заголовки дней недели
	const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
	buttons.push(daysOfWeek.map((day) => Markup.button.callback(day, 'IGNORE')));

	// Определяем первый день месяца и количество дней в месяце
	const firstDay = new Date(year, month, 1);
	const startingDay = (firstDay.getDay() + 6) % 7; // Перенос воскресенья в конец (0 - понедельник, 6 - воскресенье)
	const daysInMonth = new Date(year, month + 1, 0).getDate(); // Количество дней в месяце

	let date = 1;
	// Генерируем кнопки для каждого дня месяца, распределяя их по неделям
	for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
		const week: InlineKeyboardButton[] = [];
		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			if (weekIndex === 0 && dayIndex < startingDay) {
				// Заполняем пустые дни до начала месяца
				week.push(Markup.button.callback(' ', 'IGNORE'));
			} else if (date > daysInMonth) {
				// Заполняем пустые дни после окончания месяца
				week.push(Markup.button.callback(' ', 'IGNORE'));
			} else {
				// Формируем строку даты в формате YYYY-MM-DD
				const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
				// Проверяем, выбрана ли данная дата пользователем
				const isSelected = selectedDates.includes(dateString);
				// Добавляем кнопку для выбора даты, с отметкой если дата уже выбрана
				week.push(Markup.button.callback(isSelected ? `✅ ${date}` : `${date}`, `SELECT_DATE_${dateString}`));
				date++;
			}
		}

		// Добавляем неделю в массив кнопок
		buttons.push(week);
		if (date > daysInMonth) {
			// Прерываем цикл, если все дни месяца добавлены
			break;
		}
	}

	// Добавляем кнопку "Готово" для завершения выбора дат
	buttons.push([Markup.button.callback('Готово', 'DONE')]);

	// Возвращаем разметку с кнопками
	return Markup.inlineKeyboard(buttons);
}
