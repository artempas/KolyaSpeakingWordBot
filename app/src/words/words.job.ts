
export class AddTranslationJob {
    static readonly JOB_NAME = 'AddTranslation';

    version = 1;

    constructor(
        public word_id: number
    ){}
}