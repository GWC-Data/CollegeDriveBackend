const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let connStr = process.env.Mongodb_URL;
    if (!connStr) {
      console.error('Error: Mongodb_URL is not defined in environment variables.');
      process.exit(1);
    }
    
    // Parse and URL-encode the password dynamically if needed
    if (connStr.startsWith('mongodb+srv://') || connStr.startsWith('mongodb://')) {
      const protocol = connStr.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://';
      const afterProtocol = connStr.substring(protocol.length);
      const lastAtIndex = afterProtocol.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const credentials = afterProtocol.substring(0, lastAtIndex);
        const host = afterProtocol.substring(lastAtIndex + 1);
        const firstColonIndex = credentials.indexOf(':');
        
        if (firstColonIndex !== -1) {
          const username = credentials.substring(0, firstColonIndex);
          const password = credentials.substring(firstColonIndex + 1);
          
          // Only encode if it's not already encoded
          if (password.includes('@') || password.includes('#') || password.includes(':') || password.includes('/') || password.includes('+')) {
            const encodedPassword = encodeURIComponent(password);
            connStr = `${protocol}${username}:${encodedPassword}@${host}`;
          }
        }
      }
    }
    
    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
