import { Module } from '@nestjs/common';
import { WordsService } from './words.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Word } from '@kolya-quizlet/entity';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';


@Module({
    imports: [
        TypeOrmModule.forFeature([Word]),
        BullModule.registerQueue({name: WordsService.queueName}),
        BullBoardModule.forFeature({
            name: WordsService.queueName,
            adapter: BullMQAdapter,
        }),
    ],
    providers: [WordsService],
    exports: [
        WordsService
    ]
})
export class WordsModule {}
