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

  type RateLimitUserDetail {
    userId: ID!
    currentRequests: Int!
    remainingRequests: Int!
    isLimited: Boolean!
    usagePercentage: Float!
  }

  type RateLimitStats {
    totalUsersWithRequests: Int!
    limitedUsers: Int!
    windowMs: Int!
    maxRequests: Int!
    userDetails: [RateLimitUserDetail!]!
  }

  type MessageResponse {
    message: Message
    rateLimitInfo: RateLimitInfo!
    success: Boolean!
    error: String
  }

  type UserStats {
    totalUsers: Int!
    activeUsers: Int!
    recentSignups: Int!
  }

  type MessageStats {
    totalMessages: Int!
    avgMessageLength: Float!
    messagesInLastHour: Int!
    messagesInLastDay: Int!
    oldestMessage: Date
    newestMessage: Date
  }

  type SystemStats {
    userStats: UserStats!
    messageStats: MessageStats!
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
    rateLimitStats: RateLimitStats!
    
    # Statistics queries
    systemStats: SystemStats!
    userStats(userId: ID): UserStats!
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

  type Subscription {
    # Real-time subscriptions
    messageAdded: Message!
    userAdded: User!
    rateLimitWarning(userId: ID!): RateLimitInfo!
  }
`;

module.exports = typeDefs;
