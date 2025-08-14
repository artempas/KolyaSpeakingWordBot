import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
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

    private readonly __openai = new OpenAI();

    private readonly __deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com'
    });

    constructor(){}

    getStructuredResponse<T extends z.Schema>(
        system: string,
        user: string,
        schema?: T,
    ): Promise<z.infer<T>>

    getStructuredResponse(system: string, user: string): Promise<string>

    async getStructuredResponse<T extends z.Schema>(
        system: string,
        user: string,
        schema?: T,
    ): Promise<z.infer<T>|string> {
        let response: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            const request:ChatCompletionMessageParam[] = [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ];
            console.log('Waiting for openai response. request:', request);
            response = await this.agent.chat.completions.create({
                model: this.model,
                messages: request,
                response_format: {
                    type: schema ? 'json_object' : 'text'
                }
            });

            if (response?.choices?.[0]?.message?.content) {
                console.log('Responded with', response.choices);
                if (schema){
                    let parsed: z.infer<T>;
                    try {
                        const jsonContent = JSON.parse(response.choices[0].message.content);
                        parsed = schema.parse(jsonContent);
                    } catch (e) {
                        console.error(e);
                        attempts++;
                        continue;
                    }
                    return parsed;
                } else return response?.choices?.[0]?.message?.content;
            }
        }
        return null;
    }
}
