import type { Context } from 'telegraf';
import type { SessionData } from './sessionData.js';

// Определение типа для аэропорта
export type Airport = {
	code: string; // Код аэропорта (например, "JFK")
	name: string; // Название аэропорта (например, "Международный аэропорт Шереметьево")
};

// Определение типа для информации о рейсе
export type Flight = {
	airline: string; // Название авиакомпании (например, "Аэрофлот")
	date: string; // Дата рейса в формате YYYY-MM-DD
	departure_at: string; // Время вылета в формате HH:MM
	flight_number: string; // Номер рейса (например, "DL123")
	price: number; // Цена билета на рейс
	return_at?: string; // Время возврата (опционально, для обратного рейса)
};

// Определение типа для контекста MyContext, который расширяет стандартный контекст Telegraf
export type MyContext = Context & {
	match: RegExpExecArray | null; // Результат сопоставления с регулярным выражением (или null, если нет совпадений)
	session: SessionData; // Данные сессии для хранения информации о пользователе между взаимодействиями
};
