const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const userResolvers = require('./userResolvers');
const messageResolvers = require('./messageResolvers');

// Custom Date scalar type
const DateType = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value) {
    // Serialize Date to ISO string for output
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    throw new Error('Value must be a Date, string, or number');
  },
  parseValue(value) {
    // Parse value from variables
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date string');
      }
      return date;
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
    if (value instanceof Date) {
      return value;
    }
    throw new Error('Value must be a string, number, or Date');
  },
  parseLiteral(ast) {
    // Parse literal value from query
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date string');
      }
      return date;
    }
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10));
    }
    throw new Error('Date must be a string or number');
  }
});

// Merge all resolvers
const resolvers = {
  // Custom scalar types
  Date: DateType,

  // Merge Query resolvers
  Query: {
    ...userResolvers.Query,
    ...messageResolvers.Query
  },

  // Merge Mutation resolvers
  Mutation: {
    ...userResolvers.Mutation,
    ...messageResolvers.Mutation
  },

  // Type resolvers
  User: userResolvers.User,
  Message: messageResolvers.Message,

};

module.exports = resolvers;
