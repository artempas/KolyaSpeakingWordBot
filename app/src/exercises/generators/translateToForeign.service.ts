import { Injectable } from '@nestjs/common';
import { Exercise, ExerciseType, Question } from '@kolya-quizlet/entity';
import { ExerciseGenerator } from './generator.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractTranslationGenerator } from './abstractTranslation';

@Injectable()
@ExerciseGenerator()
export class TranslateToForeignGenerationService extends AbstractTranslationGenerator<ExerciseType.TRANSLATE_TO_FOREIGN>{

    static forType = ExerciseType.TRANSLATE_TO_FOREIGN;

    static display_name = '🌍Перевести на английский';

    protected source: AbstractTranslationGenerator<ExerciseType.TRANSLATE_TO_FOREIGN>['source'] = 'translation';

    protected dest: AbstractTranslationGenerator<ExerciseType.TRANSLATE_TO_FOREIGN>['dest'] = 'word';

    constructor(
        @InjectRepository(Question) protected questionRepo: Repository<Question>,
        @InjectRepository(Exercise) protected exerciseRepo: Repository<Exercise>
    ){ super(questionRepo, exerciseRepo); }

    protected getQuestion(word: string): string{
        return `Как по-английски будет <b>${word}</b>?`;
    }
}