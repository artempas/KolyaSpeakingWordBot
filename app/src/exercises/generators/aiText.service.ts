import z from 'zod';
import { AbstractStaticGetter, IGenerator } from './interface';
import { User, Word, ExerciseType, Exercise, Question, ExerciseStatus } from '@kolya-quizlet/entity';
import { ExerciseGenerator } from './generator.decorator';
import { Inject } from '@nestjs/common';
import { LlmService } from 'llm/llm.service';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

@ExerciseGenerator(ExerciseType.AI_TEXT)
export class AITextGenerationService extends AbstractStaticGetter implements IGenerator<AITextGenerationService['schema']>{

    static minWords = 5;

    static maxWords = 15;

    static requires_translation = false;

    schema = z.object({
        text: z.string().optional(),
        questions: z.array(z.object({
            question: z.string(),
            correct_index: z.number(),
            options: z.array(z.string()),
            word_id: z.number()
        }))
    });

    //     private prompt = `
    // Ты профессиональный репетитор по английскому языку.
    // Составь связный и интересный текст с использованием как минимум 3 слов из переданного тебе списка. Текст должен содержать не более 500 слов. Не обязательно использовать все переданные тебе слова.
    // Добавь задания multiple choice по каждому использованному из списка слову. Задания должны быть по предоставленным тебе словам. Вопросы в заданиях должны быть логичными. Правильным вариантом ответа ВСЕГДА должно быть одно из слов, которые тебе переданы в списке.
    // Слова из списка должны быть выделены в тексте через <b>СЛОВО</b>
    // ПРИМЕР ЗАПРОСА:
    // {"level":"B2","words":[{"id":12,"word":"internet"},{"id":19,"word":"people"},{"id":33,"word":"holiday"},{"id":17,"word":"newspaper"},{"id":31,"word":"technology"},{"id":29,"word":"program"},{"id":8,"word":"education"},{"id":7,"word":"doctor"},{"id":9,"word":"family"},{"id":13,"word":"journey"},{"id":24,"word":"university"},{"id":28,"word":"mountain"},{"id":30,"word":"system"},{"id":18,"word":"office"},{"id":14,"word":"knowledge"},{"id":27,"word":"yesterday"},{"id":22,"word":"school"},{"id":6,"word":"chair"},{"id":26,"word":"window"},{"id":5,"word":"book"}]}
    // ПРИМЕР ОТВЕТА:
    // {"text":"Yesterday, I read an interesting article in the newspaper about how technology has changed the way people spend their holiday. It mentioned a family who decided to embark on a journey to a remote mountain instead of going to the beach. They used the internet to find a unique program that combines education with adventure. The program was designed by a doctor from a well-known university, aiming to teach children about the ecosystem through hands-on activities. The article highlighted how this innovative system of learning outside the traditional school environment can enhance knowledge. It also featured a photo of the family sitting on a chair near a window, deeply engaged in a book about local wildlife. The story made me think about how much office workers miss by not stepping out of their routine.","questions":[{"options":["Internet","Newspaper","Technology","Education"],"question":"What has changed the way people spend their holiday according to the text?","correct_index":2,"word_id":12},{"options":["Beach","Mountain","University","Office"],"question":"Where did the family decide to go for their holiday?","correct_index":1,"word_id":28},{"options":["Book","Internet","Newspaper","School"],"question":"What did the family use to find their holiday program?","correct_index":1,"word_id":12},{"options":["Teacher","Doctor","Family","People"],"question":"Who designed the program the family participated in?","correct_index":1,"word_id":7},{"options":["School","University","Office","Mountain"],"question":"Where was the doctor from?","correct_index":1,"word_id":24}]}
    //     `;

    private prompt = `
    Write a connected, coherent, and engaging text of no more than 500 words, using at least 3 (but not necessarily all) of the provided words. In your narrative, highlight EACH occurrence of a used word from the list by wrapping it in <b></b> tags, like this: <b>word</b>.

After your narrative, create one multiple-choice question (MCQ) for EACH used word from the list. Each MCQ must directly relate to the meaning or use of that word as it appeared in your story and must present 4 options (one correct, three plausible distractors). The position of the correct answer within these 4 options should be randomized for each MCQ (do not always use the first position), and you must clearly indicate which option is correct by setting the "correct_index" property to the correct 0-based index in the "options" array. 

All instructions, formatting, and output standards MUST be followed precisely.

# Steps
1. Write the main text, using at least 3 words from the provided list. Highlight all instances of each used word in the text with <b>...</b>.
2. For each highlighted word, write one MCQ that tests understanding of the word as used in your narrative context.
3. For each question, provide four answer choices. Randomly order the correct answer among the four choices, rather than always in the first position.
4. Clearly specify which option is correct for each MCQ by setting the "correct_index" to the 0-based position of the correct answer in your "options" array.
5. Output your results as a JSON object following the schema below.

# Output Format

Output a single JSON object with these fields and structure:
- "text": string (the narrative, with every instance of used words from the list highlighted via <b>...</b>)
- "questions": array of objects, one for each used word, each with:
    - "question": string (the MCQ)
    - "options": array of 4 strings (the answer choices, with correct answer in a random index)
    - "word_id": number (the ID of the used word, as in the input)
    - "correct_index": number (0-based index of the correct answer within "options" array; do not always use 0)

# Example

Input:
{"level":"B2","words":[{"id":12,"word":"internet"},{"id":19,"word":"people"},{"id":33,"word":"holiday"}]}

Output:
{
  "text": "During my last <b>holiday</b>, I met amazing <b>people</b> who taught me how to use the <b>internet</b> to plan adventures. The <b>internet</b> made booking tickets and finding activities easy, and the advice from friendly <b>people</b> made my <b>holiday</b> unforgettable.",
  "questions": [
    {
      "question": "In the text, what does the word 'holiday' refer to?",
      "options": [
        "A local restaurant",
        "An online event",
        "A period of leisure or travel away from work or school",
        "A work meeting"
      ],
      "word_id": 33,
      "correct_index": 2
    },
    {
      "question": "What role do 'people' play in the narrator's experience?",
      "options": [
        "They create problems during the journey",
        "They book tickets for the narrator",
        "They run the internet service",
        "They help the narrator and enhance the trip"
      ],
      "word_id": 19,
      "correct_index": 3
    },
    {
      "question": "According to the story, how is the 'internet' useful?",
      "options": [
        "It helps plan and organize travel activities",
        "It allows chatting with strangers only",
        "It makes traveling more expensive",
        "It stops people from enjoying holidays"
      ],
      "word_id": 12,
      "correct_index": 0
    }
  ]
}

# Notes
- Do NOT always place the correct answer in position 0; randomize its placement for each question.
- Set "correct_index" accurately for each question to match the actual position (0-3) of the correct answer.
- Carefully highlight every occurrence of each used word in your narrative using <b>...</b> tags.
- Strictly follow the output JSON schema with the narrative first and then MCQs, as shown.
- Each MCQ should test comprehension of the word in the narrative context; distractors must be plausible but incorrect.
- Avoid using other input words in MCQ options unless absolutely required by context.

REMINDER: For every MCQ, randomize the placement of the correct answer and match "correct_index" accordingly in your JSON output.`;

    constructor (
        @Inject() private llmService: LlmService,
        @InjectRepository(Exercise) private exerciseRepo: Repository<Exercise<z.infer<AITextGenerationService['schema']>>>,
        @InjectRepository(Question) private questionRepo: Repository<Question>,
    ){ super(); }

    async generateExercise(user: User, words: Word[]) {
        const generatedTask = await this.llmService.getStructuredResponse(
            this.prompt,
            JSON.stringify({
                words: words.map(w => ({word: w.word, id: w.id})),
                level: user.level
            }),
            this.schema,
        );
        if (!generatedTask) throw new Error('Unable to generate task');

        const questions = this.taskToQuestions(generatedTask, words);

        if (!questions.length) throw new Error('No valid questions were generated for this task:(');

        const newExercise = this.exerciseRepo.create({
            user_id: user.id,
            generated: generatedTask,
            status: ExerciseStatus.GENERATED,
            type: ExerciseType.AI_TEXT,
            questions
        });
        return await this.exerciseRepo.save(newExercise);
    }

    private taskToQuestions(generatedTask: any, pickedWords: Word[]): Question[]{
        const parsedTask = this.schema.parse(generatedTask);
        const result: Question[] = [];
        for (const question of parsedTask.questions){
            const word = pickedWords.find(
                w => w.id === question.word_id
            );
            if (word)
                result.push(this.questionRepo.create({
                    word,
                }));
            else {
                console.log(`Question about word "${question.options[question.correct_index]}" is discarded bcs no such word was given to AI. List of given words: ${pickedWords.map(w => w.word).join(',')}`);
            }
        }
        return result;
    }

    async handleAnswer(
        question_id: number,
        args: {is_correct?: boolean, option_idx?: number}
    ): Promise<{finished: false, is_correct: boolean}|{finished: true, total: number, correct: number, is_correct: boolean}> {
        const question = await this.questionRepo.findOneOrFail({ where: { id: question_id }, relations: {exercise: true} });

        if (args.is_correct !== undefined)
            question.is_correct = args.is_correct;
        else if (args.option_idx !== undefined){
            question.is_correct = question.exercise.generated.correct_idx === args.option_idx;
        } else throw new Error('Either is_correct or option_idx must be defined');

        await this.questionRepo.save(question);

        const finished = !await this.questionRepo.exists({where: {exercise_id: question.exercise_id, is_correct: IsNull()}});

        if (finished) {
            await this.exerciseRepo.update({id: question.exercise_id}, {status: ExerciseStatus.ANSWERED});
            return {
                is_correct: question.is_correct,
                finished: true,
                total: await this.questionRepo.countBy({exercise_id: question.exercise_id}),
                correct: await this.questionRepo.countBy({exercise_id: question.exercise_id, is_correct: true})
            };
        }
        return {finished, is_correct: question.is_correct};
    }

}