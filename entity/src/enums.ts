export enum Position {
  MENU = 'MENU',
  VOCABULARY = 'VOCABULARY',
  ADD_WORD = 'ADD_WORD',
  REMOVE_WORD = 'REMOVE_WORD',
  EXERCISE = 'EXERCISE',
  SETTINGS = 'SETTINGS',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE'
}

export enum UserLevel {
    A1 = 'A1',
    A2 = 'A2',
    B1 = 'B1',
    B2 = 'B2',
    C1 = 'C1',
    C2 = 'C2'
}

export enum ExerciseType {
    TEXT_WITH_MULTIPLE_CHOICE = 'text_with_multiple_choice',
    MULTIPLE_CHOICE = 'multiple_choice'
}

export enum ExerciseStatus {
    GENERATED = 'GENERATED',
    ASKED = 'ASKED',
    ANSWERED = 'ANSWERED'
}