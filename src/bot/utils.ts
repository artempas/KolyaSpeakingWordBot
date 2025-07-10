import { InlineKeyboardButton, KeyboardButton } from 'node-telegram-bot-api';

export function buildKeyboard<T extends InlineKeyboardButton|KeyboardButton>(
    data: T[], options?: {
    back_button?: T,
    previous_page?: T,
    next_page?: T,
    columns?: number
}
): T[][]{
    const columns = options?.columns ?? 2;
    const rows: any[] = [];
    for (let i = 0; i < data.length; i += columns) {
        const row = data.slice(i, i + columns);
        rows.push(row);
    }

    if (options?.previous_page || options?.next_page) {
        const navRow = [];
        if (options.previous_page) {
            navRow.push(options.previous_page);
        }
        if (options.next_page) {
            navRow.push(options.next_page);
        }
        if (navRow.length) rows.push(navRow);
    }
    if (options?.back_button) {
        rows.push([options.back_button]);
    }
    return rows;
}