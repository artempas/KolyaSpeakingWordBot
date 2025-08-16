import { EntityList } from '@kolya-quizlet/entity';
import { DataSource, DataSourceOptions } from 'typeorm';
export const typeormConfig: DataSourceOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: EntityList,
    logging: 'all'
};
const dataSource = new DataSource({...typeormConfig, migrations: ['migrations/**']});
export default dataSource;