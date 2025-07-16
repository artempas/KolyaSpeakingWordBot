rm -rf /app
echo 'REMOVED'
cp -R /app_source /app
echo 'COPIED'
cd /app
pnpm i
cd entity
pnpm run build
cd ../app
pnpm run build && pnpm run migration:run
pnpm run start:prod