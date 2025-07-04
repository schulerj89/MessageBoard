const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar Date

  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: Date!
    postCount: Int!
    lastPostAt: Date
    messages: [Message!]!
  }

  type Message {
    id: ID!
    body: String!
    user: User!
    createdAt: Date!
    previousMessage: Message
    nextMessage: Message
  }

  type RateLimitInfo {
    isLimited: Boolean!
    remainingRequests: Int!
    resetTime: Date
    windowMs: Int!
  }

  type MessageResponse {
    message: Message
    rateLimitInfo: RateLimitInfo!
    success: Boolean!
    error: String
  }

  type MessageStats {
    totalMessages: Int!
    avgMessageLength: Float!
    messagesInLastHour: Int!
    messagesInLastDay: Int!
    oldestMessage: Date
    newestMessage: Date
  }

  input MessageFilter {
    userId: ID
    startDate: Date
    endDate: Date
    limit: Int
    offset: Int
  }

  input UserFilter {
    active: Boolean
    limit: Int
    offset: Int
  }

  type Query {
    # User queries
    users(filter: UserFilter): [User!]!
    user(id: ID!): User
    userByEmail(email: String!): User
    
    # Message queries
    messages(filter: MessageFilter): [Message!]!
    message(id: ID!): Message
    messagesByUser(userId: ID!, limit: Int, offset: Int): [Message!]!
    recentMessages(hours: Int, limit: Int): [Message!]!
    
    # Rate limiting queries
    rateLimitStatus(userId: ID!): RateLimitInfo!
    
    # Statistics queries
    messageStats(userId: ID): MessageStats!
    
    # Health check
    health: String!
  }

  type Mutation {
    # User mutations
    createUser(name: String!, email: String!): User!
    updateUser(id: ID!, name: String, email: String): User!
    deleteUser(id: ID!): Boolean!
    
    # Message mutations
    postMessage(userId: ID!, body: String!): MessageResponse!
    updateMessage(id: ID!, body: String!): Message!
    deleteMessage(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;
