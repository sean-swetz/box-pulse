export default {
  ...require('./app.json').expo,
  extra: {
    apiUrl: 'https://boxpulseapi-production.up.railway.app/api',
    eas: {
      projectId: '12682576-77f0-4f75-86d6-f028908dd18c',
    },
  },
};
