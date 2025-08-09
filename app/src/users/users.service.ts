import { Position, User } from '@kolya-quizlet/entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {

    private readonly DEFAULT_POSITION = [Position.MENU];

    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>
    ){}

    goTo(user: User, position: Position|Position[], options?:{
        rewrite?: boolean
    }){
        if (options?.rewrite){
            if (Array.isArray(position)) user.position = position;
            else user.position = [position];
        } else {
            if (Array.isArray(position)) user.position.concat(position);
            else user.position.push(position);
        }
    }

    goBack(user:User){
        const last_position = user.position.pop();
        delete user.context[last_position!];
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
