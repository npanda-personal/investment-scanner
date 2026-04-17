module.exports = {
  datasource: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  generator: {
    client: {
      provider: 'prisma-client-js',
      previewFeatures: ['prismaSchemaFolder'],
    },
  },
};