module.exports = {
  apps: [
    {
      name: 'central_book',
      script: './src/index.ts',
      instances: 1,
      exec_mode: 'cluster',
    },
  ],
}
