export enum Position {
    START = 'START',
    MENU = 'MENU',
    VOCABULARY = 'VOCABULARY',
    ADD_WORD = 'ADD_WORD',
    REMOVE_WORD = 'REMOVE_WORD',
    EXERCISE = 'EXERCISE',
    SETTINGS = 'SETTINGS',
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
    MATCHING = 'MATCHING'
}

export enum UserLevel {
    A1 = 'A1',
    A2 = 'A2',
    B1 = 'B1',
    B2 = 'B2',
    C1 = 'C1',
    C2 = 'C2'
}

export enum OnboardingSteps {
    HELLO,
    ASK_LEVEL,
    ADD_WORDS
}

export enum ExerciseType {
    AI_TEXT = 'AI_TEXT',
    MATCH_TRANSLATION = 'MATCH_TRANSLATION',
    TRANSLATE_TO_FOREIGN = 'TRANSLATE_TO_FOREIGN',
    TRANSLATE_TO_NATIVE = 'TRANSLATE_TO_NATIVE',
}

export enum ExerciseStatus {
    GENERATED = 'GENERATED',
    ASKED = 'ASKED',
    ANSWERED = 'ANSWERED'
}