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
import Excel from './route/excel.routes.js';
import Qa from './route/qa.routes.js';
import Insm from './route/insm.routes.js'
import AuthRoute from './route/user.auth.route.js';
import AdminAuthRoute from './route/admin.auth.routes.js';
import Bkash from './route/bkash.routes.js';


const app = express();
app.use('/public', express.static(path.join(process.cwd(), 'public')));
dotenv.config();


const allowedOrigins = [
  'http://localhost:5173',
  'https://crosscareers.com',
  'https://admin.crosscareers.com',
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

app.use("/ai", aiRoutes);
app.use("/cover", coverRoutes);
//app.use('/ppt', PPT);
app.use('/doc', Docx);
//app.use('/interview', Interview);
//app.use("/excel", Excel);
app.use("/qa", Qa);
//app.use("/insm", Insm);

app.use('/api/v1/auth', AuthRoute);
app.use('/api/v1/admin', AdminAuthRoute);
app.use('/api/v1/bkash', Bkash);


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