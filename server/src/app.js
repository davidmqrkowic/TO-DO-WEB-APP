import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import boardRoutes from "./routes/boards.js";

import columnRoutes from "./routes/columns.js";
import taskRoutes from "./routes/tasks.js";
import friendRoutes from "./routes/friends.js";
import boardMemberRoutes from "./routes/boardMembers.js";
import activityRoutes from "./routes/activity.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.use("/boards", boardRoutes);
app.use("/boards", boardMemberRoutes);

app.use("/columns", columnRoutes);
app.use("/tasks", taskRoutes);
app.use("/friends", friendRoutes);
app.use("/activity", activityRoutes);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export default app;
