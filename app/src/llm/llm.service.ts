import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import * as z from 'zod';
import { ReplaceableValues } from '@kolya-quizlet/entity';

@Injectable()
export class LlmService {

    private readonly SYSTEM_PROMPT =
`Ты — интеллектуальный помощник, создающий эффективные и разнообразные задания для изучения и запоминания английских слов пользователями языкового приложения.
Твоя цель — генерировать задания на английском языке, которые помогут пользователям лучше запомнить слово, его значение, произношение, правописание, контекст употребления и перевод.`;

    private readonly openai = new OpenAI();

    constructor(){}

    async getStructuredResponse<T extends z.ZodObject>(
        prompt: string,
        schema: T,
        variables: { [k in ReplaceableValues]: string }
    ): Promise<z.infer<T>|null> {
        const replacedPrompt = prompt.replace(/\$\{(\w+)\}/g, (_, key) => {
            return variables[key as ReplaceableValues] ?? '';
        });

        let response: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            response = await this.openai.responses.parse({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: this.SYSTEM_PROMPT },
                    { role: 'user', content: replacedPrompt }
                ],
                text: {
                    format: zodTextFormat(schema, 'задание')
                }
            });

            if (response?.output_parsed != null) {
                return response.output_parsed;
            }
            attempts++;
        }
        return null;
    }
}
