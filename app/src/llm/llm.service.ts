import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ExerciseTemplate, ExerciseType, ReplaceableValues } from '@kolya-quizlet/entity';

@Injectable()
export class LlmService {

    private readonly SYSTEM_PROMPT =
`Ты — интеллектуальный помощник, создающий эффективные и разнообразные задания для изучения и запоминания английских слов пользователями языкового приложения.
Твоя цель — генерировать задания на английском языке, которые помогут пользователям лучше запомнить слово, его значение, произношение, правописание, контекст употребления и перевод.
ОТВЕТ ВСЕГДА ДОЛЖЕН БЫТЬ В ФОРМАТЕ JSON`;

    private readonly openai = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com'
    });

    constructor(){}

    async getStructuredResponse<T extends typeof ExerciseTemplate['TYPE_TO_SCHEMA_MAP'][ExerciseType]>(
        prompt: string,
        schema: T,
        variables: { [k in ReplaceableValues]: string|{word: string, id: number}[] }
    ): Promise<T|null> {
        const replacedPrompt = prompt.replace(/\$\{(\w+)\}/g, (_, key) => {
            return JSON.stringify(variables[key as ReplaceableValues]) ?? '';
        });
        let response: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            console.log('Waiting for openai response');
            response = await this.openai.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: this.SYSTEM_PROMPT + '\n' + replacedPrompt },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            level: variables.level,
                            words: variables.words
                        })
                    }
                ],
                response_format: {
                    type: 'json_object'
                }
            });

            if (response?.choices?.[0]?.message?.content) {
                console.log('Responded with', response.choices);
                return JSON.parse(response.choices[0].message.content);
            }
            attempts++;
        }
        return null;
    }
}
