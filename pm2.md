pm2 install typescript
pm2 start ./src/index.ts
pm2 list
pm2 logs
pm2 kill
pm2 monitor
yarn pm2 start ./pm2.config.js
