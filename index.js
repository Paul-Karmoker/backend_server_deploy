import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path    from 'path';
//import userRoute from './route/user.route.js';
import aiRoutes from './route/ai.routes.js';
import coverRoutes from './route/cover.routes.js';
//import authRoutes from './auth/authRoutes.js';
import PPT from './route/ppt.routes.js';
import Docx from './route/doc.routes.js';
import Interview from './route/mock.routes.js';
import Excel from './route/excelRoutes.js';
import Qa from './route/qa.routes.js';
import Insm from './route/insm.routes.js'
import AuthRoute from './src/client/auth/auth.route.js';
import AdminAuthRoute from './src/admin/auth/adminAuth.route.js';
import AdminDashboardRoute from './src/admin/dashboard/admin.route.js';
import AdminWithDrawRoute from './src/admin/adminWithdrawal/adminWithdrawal.route.js';
import UserWithDraw from './src/client/withdrawal/withdrawal.route.js';
import BkashRoute from './src/client/payment/bkash/bkash.route.js';

// Initialize Express app
const app = express();
app.use('/public', express.static(path.join(process.cwd(), 'public')));
dotenv.config();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://v0-admin-api-integration.vercel.app',
  'https://v0-admin-dashboard-design-2v.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies

// Routes
//app.use("/user", userRoute); // User-related routes
app.use("/ai", aiRoutes); // AI-related routes
app.use("/cover", coverRoutes); // Cover letter-related routes
//app.use('/auth', authRoutes);
app.use('/ppt', PPT);
app.use('/doc', Docx);
app.use('/interview', Interview);
app.use("/excel", Excel);
app.use("/qa", Qa);
app.use("/insm", Insm);
app.use("/auth", AuthRoute);
app.use("/admin/auth", AdminAuthRoute);
app.use("/admin/dashboard", AdminDashboardRoute);
app.use("/admin/withdrawal", AdminWithDrawRoute);
app.use("/user/withdrawal", UserWithDraw);
app.use("/bkash", BkashRoute);

app.get("/", (req, res) => {
  res.send("Hello World!");
})
// MongoDB Connection
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