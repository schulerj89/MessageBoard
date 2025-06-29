const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  // Schema directives can be added here if needed
  schemaDirectives: {},
  
  // Custom schema extensions
  inheritResolversFromInterfaces: true,
  
  // Schema transformations can be added here
  schemaTransforms: []
});

module.exports = schema;
