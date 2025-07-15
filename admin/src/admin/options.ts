import { AdminJSOptions, ResourceWithOptions } from 'adminjs';
import {EntityList, ExerciseTemplate} from '@kolya-quizlet/entity';

import componentLoader from './component-loader.js';
import { Resource } from '@adminjs/typeorm';

const hidden_entities = [ExerciseTemplate]
const basic_entities = EntityList.filter((i: any)=>!hidden_entities.includes(i));

const options: AdminJSOptions = {
  componentLoader,
  rootPath: '/admin',
  resources: [
    ...basic_entities, 
    {
      resource: ExerciseTemplate, 
      options: {
        properties: {
          prompt: {
            type: 'textarea',
            props: {
              rows: 20
            }
          },
          type: {
            description: 'NOT EDITABLE!'
          }
        },
        actions: {
          edit: {
            before: (request, context)=>{
              const { record } = context;
              if (record && record.id) {
                // Prevent updating the type field
                delete request.payload.type;
              }
              return request;
            }
          }
        }
      }
    } as ResourceWithOptions
  ],
  databases: [],
};

export default options;
