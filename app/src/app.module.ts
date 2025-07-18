import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from './bot/bot.module';
import { typeormConfig } from './datasource';
import { ExercisesModule } from './exercises/exercises.module';
import { LlmModule } from './llm/llm.module';
import { UsersModule } from './users/users.module';
import { WordsModule } from './words/words.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';


@Module({
    imports: [
        BotModule,
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST,
                port: +(process.env.REDIS_PORT ?? '6379'),
            },
        }),
        BullBoardModule.forRoot({
            route: '/bullmq',
            adapter: ExpressAdapter,
            middleware: process.env.NODE_ENV === 'production' ? basicAuth({
                challenge: true,
                users: { admin: process.env.BULL_BOARD_PASSWORD! },
            }) : undefined
        }),
        TypeOrmModule.forRoot(typeormConfig),
        ExercisesModule,
        LlmModule,
        UsersModule,
        WordsModule,
    ],
})
export class AppModule {}
