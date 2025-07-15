cp -R /app_source /app
cd /app
cd entity
npm i
npm run build
cd ../admin
npm i
npm run build
npm run start