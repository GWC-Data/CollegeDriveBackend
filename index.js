require('dotenv').config();
const dns = require('dns');
// Set DNS servers to resolve mongoose SRV lookup issues on some networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e.message);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');

const connectDB = require('./Config/db');
const User = require('./src/Models/User');
const SystemConfig = require('./src/Models/SystemConfig');

const userRouter = require('./src/Routers/userRouter');
const studentRouter = require('./src/Routers/studentRouter');
const questionRouter = require('./src/Routers/questionRouter');
const configRouter = require('./src/Routers/configRouter');
const adminRouter = require('./src/Routers/adminRouter');

const app = express();
const PORT = process.env.PORT || 8080;

// Connect to Database
connectDB();

// Allowed CORS origins (supports multiple dev ports + production URL)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_ALT,
  'https://college-drive-462434048008.asia-south1.run.app/',

].filter(Boolean).map(url => url.replace(/\/$/, '')); // normalize by removing trailing slash

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Normalize origin to compare
    const normalizedOrigin = origin.replace(/\/$/, '');

    if (
      allowedOrigins.includes(normalizedOrigin) ||
      normalizedOrigin.endsWith('.vercel.app') ||
      normalizedOrigin.startsWith('http://localhost:')
    ) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true
}));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Trust the reverse proxy (Render) so rate limiters see the real client IPs
app.set('trust proxy', 1);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'College Drive API is running successfully.' });
});

// General Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', generalLimiter);

// Tighter Rate Limiter for Login only (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 login attempts per 15 minutes
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});
app.use('/api/users/login', authLimiter);
app.use('/api/students/login', authLimiter);
// NOTE: /api/students/register has NO rate limit so students on shared WiFi can register freely

// Mount API Routers
app.use('/api/users', userRouter);
app.use('/api/students', studentRouter);
app.use('/api/questions', questionRouter);
app.use('/api/config', configRouter);
app.use('/api/admin', adminRouter);



// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Database Seed Function
const seedDatabase = async () => {
  try {
    // 1. Seed Super Admin using env variables (C-01)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const adminEmail = process.env.MAIN_ADMIN_EMAIL;
      const adminPassword = process.env.MAIN_ADMIN_PASSWORD;

      if (!adminEmail || !adminPassword) {
        throw new Error('FATAL: MAIN_ADMIN_EMAIL and MAIN_ADMIN_PASSWORD must be set in .env to seed the default admin.');
      }

      console.log('Seeding default Super Admin user...');
      const defaultAdmin = new User({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword, // Will be hashed via pre-save hook
        role: 'Admin'
      });
      await defaultAdmin.save();
      console.log(`Default Admin seeded with email: ${adminEmail}`);
    }

    // 2. Seed System Config
    let config = await SystemConfig.findOne();
    if (!config) {
      console.log('Seeding default System Config...');
      config = new SystemConfig({
        testActive: true,
        shuffleQuestions: true,
        shuffleOptions: true
      });
      await config.save();
      console.log('System Config seeded');
    }
  } catch (seedErr) {
    console.error('Error seeding database:', seedErr);
  }
};

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  await seedDatabase();
});
