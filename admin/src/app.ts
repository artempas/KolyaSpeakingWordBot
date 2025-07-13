import express from 'express';
import AdminJS from 'adminjs';
import { buildAuthenticatedRouter } from '@adminjs/express';
import * as AdminJSTypeorm from '@adminjs/typeorm'
import provider from './admin/auth-provider.js';
import options from './admin/options.js';
import { DataSource } from 'typeorm';
import { EntityList } from '@kolya-quizlet/entity';

const port = process.env.PORT || 3000;

AdminJS.registerAdapter({ 
  Database: AdminJSTypeorm.Database, 
  Resource: AdminJSTypeorm.Resource 
});

const start = async () => {

  const app = express();

  const dataSource = new DataSource({
  /*
   Note: Casting "as any" to avoid TypeORM type errors when building a generic template.
   Please import types specific to your database dialect, i. e. PostgresConnectionOptions
  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: EntityList,
  migrations: ['../app/migrations']
  });
  await dataSource.initialize();

  const admin = new AdminJS(options);

  if (process.env.NODE_ENV === 'production') {
    await admin.initialize();
  } else {
    admin.watch();
  }

  const router = buildAuthenticatedRouter(
    admin,
    {
      cookiePassword: process.env.COOKIE_SECRET,
      cookieName: 'adminjs',
      provider,
    },
    null,
    {
      secret: process.env.COOKIE_SECRET,
      saveUninitialized: true,
      resave: true,
    },
  );

  app.use(admin.options.rootPath, router);

  app.listen(port, () => {
    console.log(`AdminJS available at http://localhost:${port}${admin.options.rootPath}`);
  });
};

start();
