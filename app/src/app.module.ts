import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from './bot/bot.module';
import { typeormConfig } from './datasource';
import { ExercisesModule } from './exercises/exercises.module';
import { LlmModule } from './llm/llm.module';

@Module({
    imports: [
        BotModule,
        TypeOrmModule.forRoot(typeormConfig),
        ExercisesModule,
        LlmModule,
    ],
})
export class AppModule {}
