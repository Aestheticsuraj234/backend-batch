import express from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes.js"
import { connectDB } from './config/db.config.js';
import dotenv from "dotenv";

const app = express();
dotenv.config()

connectDB()
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cors());
app.use(cookieParser())

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Uber backend API' });
});


// Going to implement our application api routes
app.use("/api/v1/users" , userRoutes)

export default app;
