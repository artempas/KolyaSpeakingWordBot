import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from './bot/bot.module';
import { typeormConfig } from './datasource';
import { ExercisesModule } from './exercises/exercises.module';
import { LlmModule } from './llm/llm.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        BotModule,
        TypeOrmModule.forRoot(typeormConfig),
        ExercisesModule,
        LlmModule,
        UserModule,
    ],
})
export class AppModule {}
