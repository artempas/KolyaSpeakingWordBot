import { Position, User } from '@kolya-quizlet/entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {

    private readonly DEFAULT_POSITION = [Position.MENU];

    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>
    ){}

    goTo(user: User, position: Position){
        user.position.push(position);
    }

    goBack(user:User){
        user.position.pop();
        if (!user.position.length){
            user.position = [...this.DEFAULT_POSITION];
        }
    }

    getCurrentPosition(user: User): Position{
        return user.position[user.position.length - 1];
    }

    getUserByTelegramId(...args: Parameters<typeof this.userRepo.findOneOrFail>): Promise<User>{
        return this.userRepo.findOneOrFail(...args);
    }
}
