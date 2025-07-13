import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from './bot/bot.module';
import { typeormConfig } from './datasource';

@Module({
    imports: [
        BotModule,
        TypeOrmModule.forRoot(typeormConfig),
    ],
})
export class AppModule {}
