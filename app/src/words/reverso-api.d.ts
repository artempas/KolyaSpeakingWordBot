declare module 'reverso-api' {
    type Language =
        | 'arabic'
        | 'german'
        | 'spanish'
        | 'french'
        | 'hebrew'
        | 'italian'
        | 'japanese'
        | 'dutch'
        | 'polish'
        | 'portuguese'
        | 'romanian'
        | 'russian'
        | 'turkish'
        | 'chinese'
        | 'english'
        | 'swedish'
        | 'ukrainian';

    interface ContextExample {
        id: number;
        source: string;
        target: string;
    }

    interface GetContextResult {
        ok: true;
        text: string;
        source: string;
        target: string;
        translations: string[];
        examples: ContextExample[];
    }

    interface ErrorResult {
        ok: false;
        message: string;
    }

    interface SpellCorrection {
        id: number;
        text: string;
        type: string;
        explanation: string;
        corrected: string;
        suggestions: string;
    }

    interface GetSpellCheckResult {
        ok: true;
        text: string;
        sentences: any[];
        stats: any[];
        corrections: SpellCorrection[];
    }

    interface Synonym {
        id: number;
        synonym: string;
    }

    interface GetSynonymsResult {
        ok: true;
        text: string;
        source: string;
        synonyms: Synonym[];
    }

    interface GetTranslationResult {
        ok: true;
        text: string;
        source: string;
        target: string;
        translations: string[];
        detected_language: string;
        voice: string | null;
        context?: {
            examples: {
                id: number;
                source: string;
                target: string;
                source_phrases: { phrase: string; offset: number; length: number }[];
                target_phrases: { phrase: string; offset: number; length: number }[];
            }[];
            rude: boolean;
        };
    }

    interface GetConjugationResult {
        ok: true;
        infinitive: string;
        verbForms: {
            id: number;
            conjugation: string;
            verbs: string[];
        }[];
    }

    type Callback<T> = ((err: ErrorResult | null, result?: T) => void) | null;

    interface ReversoOptions {
        insecureHTTPParser?: boolean;
    }

    class Reverso {
        constructor(options?: ReversoOptions);

        getContext(
            text: string,
            source?: Language,
            target?: Language,
            cb?: Callback<GetContextResult>
        ): Promise<GetContextResult | ErrorResult>;

        getSpellCheck(
            text: string,
            source?: 'english' | 'french' | 'italian' | 'spanish',
            cb?: Callback<GetSpellCheckResult>
        ): Promise<GetSpellCheckResult | ErrorResult>;

        getSynonyms(
            text: string,
            source?: Language,
            cb?: Callback<GetSynonymsResult>
        ): Promise<GetSynonymsResult | ErrorResult>;

        getTranslation(
            text: string,
            source?: Language,
            target?: Language,
            cb?: Callback<GetTranslationResult>
        ): Promise<GetTranslationResult | ErrorResult>;

        getConjugation(
            text: string,
            source?: Language,
            cb?: Callback<GetConjugationResult>
        ): Promise<GetConjugationResult | ErrorResult>;
    }

    export = Reverso;
}