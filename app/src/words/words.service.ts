import { User, Word } from '@kolya-quizlet/entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { AddTranslationJob } from './words.job';
import Reverso from 'reverso-api';

@Injectable()
@Processor(
    WordsService.queueName,
    {
        limiter: {
            max: 20,
            duration: 1_000
        }
    }
)
export class WordsService extends WorkerHost{
    static readonly queueName = 'WordsService';

    private readonly reverso = new Reverso();

    constructor(
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>,
        @InjectQueue(WordsService.queueName) private queue: Queue<AddTranslationJob>
    ){ super(); }

    async addWords(words: string[], user: User){
        const saved = await this.wordRepo.save(words.map(word => this.wordRepo.create({
            word: word.toLowerCase(),
            user
        })));
        await this.queue.addBulk(saved.map(word => ({
            name: AddTranslationJob.JOB_NAME,
            data: new AddTranslationJob(word.id),
            opts: {
                removeOnComplete: {age: 60 * 60 * 24 * 7},
                attempts: 10,
                backoff: {
                    type: 'exponential',
                    delay: 10_000,
                },
            }
        })));
        return words;

    }

    async process(job: Job<AddTranslationJob>, token?: string): Promise<any> {

        const word = await this.wordRepo.findOneBy({
            id: job.data.word_id
        });

        if (!word){
            await job.log(`Word with id ${job.data.word_id} not found. Stopping`);
            return false;
        }
        let translation_response;
        try {
            translation_response = await this.reverso.getTranslation(word.word, 'english', 'russian');
            if (!translation_response.ok){
                throw new Error(translation_response.message);
            }
        } catch (e: any){
            await job.log(`API_ERROR: ${e}.\nWORD_ID:${job.data.word_id}\nWORD: ${JSON.stringify(word)}`);
            throw e;
        }
        await job.log(`Got translation response: ${JSON.stringify(translation_response)}`);
        if (translation_response.translations[0]){
            word.translation = translation_response.translations[0];
        }
        await word.save();
        await job.log(`Word updated: ${JSON.stringify({ id: word.id, word: word.word, translation: word.translation })}`);
        return true;
    }
}
