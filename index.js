import dotenv from "dotenv"
dotenv.config()
import cookieParser from "cookie-parser"
import cors from "cors"

import express from "express"

import { connectDB } from "./db/db.js"
import { userRouter } from "./routes/user.routes.js"
import { todoRouter } from "./routes/todo.routes.js"
import { invitationRouter } from "./routes/invitation.routes.js"
import { subTodoRouter } from "./routes/subTodo.routes.js"
import { connectRedis } from "./config/redis.js"

const app = express()
const PORT = process.env.PORT || 4000

// MongoDB connection
connectDB()
connectRedis()

app.use(cookieParser())
app.set("trust proxy", true);
app.use(express.json())
app.use(cors({
      origin: ["https://collaborative-todo-app-l4vy.vercel.app", "http://localhost:5173"],
      credentials: true
}))

// API Endpoints
app.use("/api/user", userRouter)
app.use("/api/todo", todoRouter)
app.use("/api/sub-todo", subTodoRouter)
app.use("/api/todo/invite", invitationRouter)

app.listen(PORT, () => console.log(`server started at port ${PORT}`))
