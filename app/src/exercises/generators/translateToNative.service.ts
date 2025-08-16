import { Injectable } from '@nestjs/common';
import { Exercise, ExerciseType, Question } from '@kolya-quizlet/entity';
import { ExerciseGenerator } from './generator.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractTranslationGenerator } from './abstractTranslation';

@Injectable()
@ExerciseGenerator()
export class TranslateToNativeGenerationService extends AbstractTranslationGenerator<ExerciseType.TRANSLATE_TO_NATIVE>{

    static display_name = '🌍Перевести на русский';

    static forType = ExerciseType.TRANSLATE_TO_NATIVE;

    protected source: AbstractTranslationGenerator<ExerciseType.TRANSLATE_TO_NATIVE>['source'] = 'word';

    protected dest: AbstractTranslationGenerator<ExerciseType.TRANSLATE_TO_NATIVE>['dest'] = 'translation';

    constructor(
        @InjectRepository(Question) questionRepo: Repository<Question>,
        @InjectRepository(Exercise) exerciseRepo: Repository<Exercise>
    ){ super(questionRepo, exerciseRepo); }

    protected getQuestion(word: string): string{
        return `Как переводится слово <b>${word}</b>?`;
    }
}