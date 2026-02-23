import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

import { User } from "../models/user.models.js";
import { transporter } from "../services/emailService.js";
import { welcomeEmail } from "../utils/emailTemplate.js";
import redisClient from "../config/redis.js";

export const registerUser = async (req, res) => {
      try {
            const { userName, email, password } = req.body;

            if (!userName || !email || !password) {
                  return res.status(400).json({ success: false, message: "Missing value" });
            }

            // Check for existing userName
            if (await User.findOne({ userName })) {
                  return res.status(409).json({ success: false, message: "userName already exists" });
            }

            // Check for existing email
            if (await User.findOne({ email })) {
                  return res.status(409).json({ success: false, message: "Email already exists" });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Prepare user object
            const user = new User({ userName, email, password: hashedPassword });

            // Send welcome
            try {
                  await transporter.sendMail(welcomeEmail(email, userName));
            } catch (emailError) {
                  console.error("Failed to send welcome email:", emailError.message);
                  return res.status(500).json({
                        success: false,
                        message: "User creation failed: could not send welcome email"
                  });
            }

            // Save user
            await user.save();

            res.status(201).json({ success: true, message: "User created successfully" });

      } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error while creating user" });
      }
};

export const loginUser = async (req, res) => {
      try {
            const { identifier, password } = req.body;

            if (!identifier || !password) {
                  return res.status(400).json({
                        success: false,
                        message: "Invalid credentials"
                  });
            }

            let ip =
                  req.headers["x-forwarded-for"]?.split(",")[0] ||
                  req.socket.remoteAddress ||
                  "unknown";

            // remove IPv6 prefix if exists
            ip = ip.replace(/^::ffff:/, "");

            const ipKey = `login_ip_attempts:${ip}`;

            // 🔒 1️⃣ IP Rate Limiting (20 attempts per minute)
            const ipAttempts = await redisClient.incr(ipKey);

            if (ipAttempts === 1) {
                  await redisClient.expire(ipKey, 60); // 1 minute window
            }

            if (ipAttempts > 20) {
                  return res.status(429).json({
                        success: false,
                        message: "Too many login attempts. Try again later."
                  });
            }

            // 🔍 2️⃣ Find User (No enumeration)
            const user = await User.findOne({
                  $or: [{ email: identifier }, { userName: identifier }]
            });

            if (!user) {
                  // Still counts toward IP limit
                  return res.status(401).json({
                        success: false,
                        message: "Invalid credentials"
                  });
            }

            const userAttemptKey = `login_attempts:${user._id}`;
            const userLockKey = `lock_login:${user._id}`;

            // 🔒 3️⃣ Check User Lock
            const isLocked = await redisClient.get(userLockKey);

            if (isLocked) {
                  const ttl = await redisClient.ttl(userLockKey);
                  return res.status(403).json({
                        success: false,
                        message: `Account locked. Try again after ${Math.ceil(ttl / 60)} minutes.`
                  });
            }

            // 🔐 4️⃣ Validate Password
            const isPasswordMatch = await bcrypt.compare(password, user.password);

            if (!isPasswordMatch) {

                  const attempts = await redisClient.incr(userAttemptKey);

                  if (attempts === 1) {
                        await redisClient.expire(userAttemptKey, 600); // 10 min window
                  }

                  if (attempts >= 5) {
                        await redisClient.set(userLockKey, "locked", { EX: 1800 }); // 30 min lock
                        await redisClient.del(userAttemptKey);

                        return res.status(403).json({
                              success: false,
                              message: "Account locked for 30 minutes due to multiple failed attempts."
                        });
                  }

                  return res.status(401).json({
                        success: false,
                        message: `Invalid credentials. ${5 - attempts} attempts remaining.`
                  });
            }

            // ✅ 5️⃣ Successful Login → Clean up
            await redisClient.del(userAttemptKey);
            await redisClient.del(userLockKey);

            const token = jwt.sign(
                  {
                        userId: user._id,
                        userName: user.userName,
                        email: user.email
                  },
                  process.env.JWT_SECRET,
                  { expiresIn: "1d" }
            );

            res.cookie("token", token, {
                  httpOnly: true,
                  secure: true,
                  sameSite: "none",
                  maxAge: 24 * 60 * 60 * 1000
            });

            return res.status(200).json({
                  success: true,
                  message: "Login successful",
                  user
            });

      } catch (error) {
            console.error(error);
            return res.status(500).json({
                  success: false,
                  message: "Server error while login"
            });
      }
};


export const logoutUser = async (req, res) => {
      try {
            res.clearCookie("token", {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "strict"
            }).status(200).json({
                  success: true,
                  message: "Logout successfully"
            })
      } catch (error) {
            console.log(error)
            res.status(500).json({
                  success: false,
                  message: "Server error while logout"
            })
      }
}

export const generateOtp = async (req, res) => {
      try {
            const { userId } = req.user;

            const user = await User.findById(userId);
            if (!user) {
                  return res.status(404).json({
                        success: false,
                        message: "User not found"
                  });
            }

            // 🔒 Check if user is locked
            const lockKey = `otp_lock:${userId}`;
            const isLocked = await redisClient.get(lockKey);

            if (isLocked) {
                  const ttl = await redisClient.ttl(lockKey); // remaining seconds
                  return res.status(400).json({
                        success: false,
                        message: `Too many failed attempts. Try again after ${Math.ceil(ttl / 60)} minutes.`
                  });
            }

            // ⛔ Prevent multiple OTP generation within 10 mins
            const existingOtp = await redisClient.get(`otp:${userId}`);
            if (existingOtp) {
                  return res.status(400).json({
                        success: false,
                        message: "OTP already sent. Please wait."
                  });
            }

            const otp = Math.floor(100000 + Math.random() * 900000);

            const hashedOtp = await bcrypt.hash(otp.toString(), 5);

            // Save OTP (10 mins)
            await redisClient.set(`otp:${userId}`, hashedOtp, { EX: 600 });

            // Initialize attempts counter
            await redisClient.set(`otp_attempts:${userId}`, 0, { EX: 600 });

            // Send Email
            await transporter.sendMail({
                  from: process.env.SENDER_EMAIL,
                  to: user.email,
                  subject: "Your OTP for Password Reset",
                  text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
            });

            res.status(200).json({
                  success: true,
                  message: "OTP sent to your email"
            });

      } catch (error) {
            console.error(error);
            res.status(500).json({
                  success: false,
                  message: "Error generating OTP"
            });
      }
};


export const resetPassword = async (req, res) => {
      try {
            const { otp, newPassword } = req.body;
            const { userId } = req.user;

            if (!otp || !newPassword) {
                  return res.status(400).json({
                        success: false,
                        message: "OTP and new password are required"
                  });
            }

            const user = await User.findById(userId);
            if (!user) {
                  return res.status(404).json({
                        success: false,
                        message: "User not found"
                  });
            }

            const otpKey = `otp:${userId}`;
            const attemptsKey = `otp_attempts:${userId}`;
            const lockKey = `otp_lock:${userId}`;

            const otpRedis = await redisClient.get(otpKey);

            if (!otpRedis) {
                  return res.status(400).json({
                        success: false,
                        message: "OTP expired or not generated."
                  });
            }

            const isOtpValid = await bcrypt.compare(otp.toString(), otpRedis);

            if (!isOtpValid) {

                  // 🔺 Increment attempts
                  const attempts = await redisClient.incr(attemptsKey);

                  if (attempts >= 5) {
                        // 🔒 Lock user for 30 mins
                        await redisClient.set(lockKey, "locked", { EX: 1800 });

                        // Cleanup
                        await redisClient.del(otpKey);
                        await redisClient.del(attemptsKey);

                        return res.status(400).json({
                              success: false,
                              message: "Too many failed attempts. You are locked for 30 minutes."
                        });
                  }

                  return res.status(400).json({
                        success: false,
                        message: `Invalid OTP. ${5 - attempts} attempts remaining.`
                  });
            }

            // ✅ OTP is valid

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();

            // Cleanup
            await redisClient.del(otpKey);
            await redisClient.del(attemptsKey);

            res.status(200).json({
                  success: true,
                  message: "Password reset successfully!"
            });

      } catch (error) {
            console.error(error);
            res.status(500).json({
                  success: false,
                  message: "Error while resetting password"
            });
      }
};
