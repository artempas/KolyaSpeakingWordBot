import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ExerciseTemplate, ExerciseType, ReplaceableValues } from '@kolya-quizlet/entity';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import z from 'zod';

@Injectable()
export class LlmService {

    current_agent: 'deepseek'|'openai' = 'openai';

    get agent(){
        return this.current_agent === 'deepseek' ? this.__deepseek : this.__openai;
    }

    get model(){
        return this.current_agent === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';
    }

    private readonly SYSTEM_PROMPT =
`Ты — интеллектуальный помощник, создающий эффективные и разнообразные задания для изучения и запоминания английских слов пользователями языкового приложения.
Твоя цель — генерировать задания на английском языке, которые помогут пользователям лучше запомнить слово, его значение, произношение, правописание, контекст употребления и перевод.
ОТВЕТ ВСЕГДА ДОЛЖЕН БЫТЬ В ФОРМАТЕ JSON`;

    private readonly __openai = new OpenAI();

    private readonly __deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com'
    });

    constructor(){}

    async getStructuredResponse<T extends typeof ExerciseTemplate.SCHEMA_ZOD_MAP[ExerciseType]>(
        prompt: string,
        schema: T,
        variables: { [k in ReplaceableValues]: any }
    ): Promise<z.infer<T>|null> {
        const replacedPrompt = prompt.replace(/\$\{(\w+)\}/g, (_, key) => {
            return JSON.stringify(variables[key as ReplaceableValues]) ?? '';
        });
        let response: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            const request:ChatCompletionMessageParam[] = [
                { role: 'system', content: this.SYSTEM_PROMPT + '\n' + replacedPrompt },
                {
                    role: 'user',
                    content: JSON.stringify({
                        level: variables.level,
                        words: variables.words
                    })
                }
            ];
            console.log('Waiting for openai response. request:', request);
            response = await this.agent.chat.completions.create({
                model: this.model,
                messages: request,
                response_format: {
                    type: 'json_object'
                }
            });

            if (response?.choices?.[0]?.message?.content) {
                console.log('Responded with', response.choices);
                let parsed;
                try {
                    const jsonContent = JSON.parse(response.choices[0].message.content);
                    parsed = schema.safeParse(jsonContent);
                } catch (e) {
                    parsed = { success: false };
                }
                if (parsed.success) return parsed.data;
            }
            attempts++;
        }
        return null;
    }
}
