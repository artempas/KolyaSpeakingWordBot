rm -rf /app
echo 'REMOVED'
cp -R /app_source /app
echo 'COPIED'
cd /app
cd entity
npm ci
npm run build
cd ../admin
npm ci
npm run build
npm run start