import express from "express";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { checkAuth } from "../middleware/auth.middleware.js";
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/signup", async (req, res) => {
  try {
    const hashcode = await bcrypt.hash(req.body.password, 10);
    const uploadedImage = await cloudinary.uploader.upload(
      req.files.logo.tempFilePath
    );
    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      channelName: req.body.channelName,
      phone: req.body.phone,
      password: hashcode,
      logoUrl: uploadedImage.secure_url,
      logoId: uploadedImage.public_id,
    });

    let user = await newUser.save();

    res.status(201).json({
      newUser: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser.length === 0) {
      return res.status(500).json({
        error: "Email is not registered...",
      });
    }

    const isValid = await bcrypt.compare(
      req.body.password,
      existingUser.password
    );

    if (!isValid) {
      return res.status(500).json({
        error: "Invalid password",
      });
    }

    const token =  jwt.sign(
      {
        _id: existingUser._id,
        channelName: existingUser.channelName,
        email: existingUser.email,
        phone: existingUser.phone,
        logoId: existingUser.logoId,
      },
      process.env.JWT_TOKEN,
      { expiresIn: "10d" }
    );

    res.status(200).json({
      _id: existingUser._id,
        channelName: existingUser.channelName,
        email: existingUser.email,
        phone: existingUser.phone,
        logoId: existingUser.logoId,
        logoUrl:existingUser.logoUrl,
        token:token,
        subscribers:existingUser.subscribers,
        subscribedChannels:existingUser.subscribedChannels

    })
  } catch (error) {
    console.log("ERROR", error);
    res.status(500).json({ Message: "Something Went Wrong" });
  }
});

router.put("/update-profile", checkAuth , async (req, res) => {
  try {
    const {  channelName, phone } = req.body;
    let updatedData = { channelName, phone };

    // Handle profile picture update
    if (req.files && req.files.logo) {

      //if wanted to update then 1st destroy the previous
      await cloudinary.uploader.destroy(user.logoId);

      //then upload new one
      const uploadedImage = await cloudinary.uploader.upload(req.files.logo.tempFilePath);
      updatedData.logoUrl = uploadedImage.secure_url;
      updatedData.logoId = uploadedImage.public_id;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updatedData, { new: true });

    res.status(200).json({ message: "Profile updated successfully", updatedUser });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/subscribe",checkAuth ,  async (req, res) => {
  try {
    const {channelId } = req.body; // userId = current user, channelId = channel to subscribe to

    if ( req.user._id === channelId) {
      return res.status(400).json({ error: "You cannot subscribe to yourself" });
    }

    // Add the channel to user's subscribed channels
    await User.findByIdAndUpdate(req.user._id , {
      $addToSet: { subscribedChannels: channelId },
    });

    // Increment subscriber count
    await User.findByIdAndUpdate(channelId, {
      $inc: { subscribers: 1 },
    });

    res.status(200).json({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("Subscription Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});



export default router;
