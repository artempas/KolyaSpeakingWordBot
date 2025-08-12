import { AdminJSOptions, ResourceWithOptions } from 'adminjs';
import { EntityList, ExerciseTemplate } from '@kolya-quizlet/entity';
import { JSONSchemaFaker, Schema } from 'json-schema-faker';
import { zodToJsonSchema } from 'zod-to-json-schema';

import componentLoader from './component-loader.js';

const hiddenEntities: typeof EntityList = [ExerciseTemplate];
const basicEntities = EntityList.filter((i) => !hiddenEntities.includes(i));

JSONSchemaFaker.option({
  alwaysFakeOptionals: true,
  optionalsProbability: 1.0,
  minLength: 3,
  maxLength: 8,
  minItems: 2,
  maxItems: 4,
  random: () => 0.5, // Use fixed seed for consistent short examples
});

const options: AdminJSOptions = {
  componentLoader,
  rootPath: '/admin',
  resources: [
    ...basicEntities,
    {
      resource: ExerciseTemplate,
      options: {
        properties: {
          'Памятка отправляемых значений':{
            isDisabled: true,
            type: 'textarea',
            isVisible: {
              edit: true
            },
            props: {
              rows: 10,
              style: { fontSize: '16px', fontFamily: 'monospace' },
              value: `
              В промпт должны быть добавлены примеры отправляемых значений.
              Слова всегда отправляются в одном и том же формате:
              {"level":"B2","words":[{"id":12,"word":"internet"},{"id":19,"word":"people"}]}
              `.trim().replace(/  +/g, ' ').replace(/\n /g, '\n'),
            },
          },
          'Памятка возвращаемых значений': {
            isDisabled: true,
            type: 'textarea',
            isVisible: {
              edit: true
            },
            props: {
              rows: 10,
              style: { fontSize: '16px', fontFamily: 'monospace' },
              value: `
              В промпт должны быть добавлены примеры возвращаемых значений. 
              В зависимости от типа задания примеры должны быть разными.
              Схемы возвращаемых значений по типам заданий:\n
              `.trim().replace(/  +/g, ' ').replace(/\n /g, '\n') +
              Object.entries(ExerciseTemplate.SCHEMA_ZOD_MAP).map(
                // eslint-disable-next-line max-len
                ([type, schema]) => `${type.toUpperCase()}: ${JSON.stringify(JSONSchemaFaker.generate(zodToJsonSchema(schema) as Schema), null, 4)}`,
              ).join('\n'),
            },
          },
          prompt: {
            type: 'textarea',
            props: {
              rows: 20,
            },
          },
          type: {
            description: `NOT EDITABLE! 
            choice - вопрос с несколькими вариантами ответов, правильный один. 
            choices - то же что choice, но вопросов несколько. 
            match - соотнести варианты с ответами.
            answer - вопрос с текстовым ответом
            `,
          },
        },
        actions: {
          edit: {
            before: (request, context) => {
              const { record } = context;
              if (record && record.id) {
                // Prevent updating the type field
                delete request.payload.type;
              }
              return request;
            },
          },
        },
      },
    } as ResourceWithOptions,
  ],
  databases: [],
};

export default options;
