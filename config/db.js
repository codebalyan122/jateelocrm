// MongoDB connection and configuration
module.exports = {
  mongoURI: process.env.MONGO_URI || "mongodb://localhost:27017/dineshcrm",
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_key",
  jwtExpire: process.env.JWT_EXPIRE || "7d",
  environment: process.env.NODE_ENV || "development",
};
