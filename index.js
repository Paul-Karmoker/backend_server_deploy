import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import session from 'express-session';
import passport from 'passport';
import './utils/passport.js';
import aiRoutes from './route/ai.routes.js';
import coverRoutes from './route/cover.routes.js';
import PPT from './route/ppt.routes.js';
import Docx from './route/doc.routes.js';
import Interview from './route/mock.routes.js';
//import Excel from './route/excel.routes.js';
import Qa from './route/qa.routes.js';
import Insm from './route/insm.routes.js'
import AuthRoute from './route/user.auth.route.js';
import AdminAuthRoute from './route/admin.auth.routes.js';
import Bkash from './route/bkash.routes.js';
import WrittenTest from './route/writtentest.routes.js';

import ResumeRouter from './route/resume.routes.js';


const app = express();
app.use('/public', express.static(path.join(process.cwd(), 'public')));
dotenv.config();


const allowedOrigins = [
  'http://localhost:5173',
  'https://crosscareers.com',
  'https://admincrosscareers.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/cover", coverRoutes);
app.use('/api/v1/ppt', PPT);
app.use('/api/v1/doc', Docx);
app.use('/api/v1/interview', Interview);
app.use("/api/v1/writtenTest", WrittenTest);
//app.use("/excel", Excel);
app.use("/qa", Qa);
app.use("/api/v1/insm", Insm);
app.use('/api/v1/auth', AuthRoute);
app.use('/api/v1/admin', AdminAuthRoute);
app.use('/api/v1/bkash', Bkash);
app.use("/api/v1/resume", ResumeRouter);


app.get("/", (req, res) => {
  res.send("Hello World!");
})

app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

const PORT = process.env.PORT || 4000;
const URI = process.env.MongoDBURI;

mongoose
  .connect(URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB:", error.message);
  });