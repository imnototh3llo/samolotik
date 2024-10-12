import type { Airport } from './types.js';

// Определение типа данных для сессии
export type SessionData = {
	// Список доступных аэропортов вылета
	airportsFrom?: Airport[];
	// Список доступных аэропортов назначения
	airportsTo?: Airport[];
	// Текущий месяц календаря, выбранный пользователем
	calendarMonth?: number;
	// Текущий год календаря, выбранный пользователем
	calendarYear?: number;
	// Код выбранного аэропорта вылета
	fromAirport?: string;
	// Название города вылета
	fromCity?: string;
	// Массив выбранных пользователем дат
	selectedDates?: string[];
	// Текущий шаг процесса выбора (например, выбор аэропорта, даты и т.д.)
	step?: string;
	// Код выбранного аэропорта назначения
	toAirport?: string;
	// Название города назначения
	toCity?: string;
};
