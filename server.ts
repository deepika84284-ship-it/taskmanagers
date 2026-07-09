import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_task_manager_key_2026";

// Create data directory if it doesn't exist
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

// Helper to load/save JSON data
function loadData<T>(filePath: string, defaultVal: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
      return defaultVal;
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error loading file: ${filePath}`, error);
    return defaultVal;
  }
}

function saveData<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving file: ${filePath}`, error);
  }
}

// Interfaces for Server Store
interface UserStoreItem {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface TaskStoreItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  category: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Token and Hashing Helpers
function generateToken(userId: string): string {
  const expiration = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `${userId}.${expiration}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifyToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [userId, expiration, signature] = parts;
    if (parseInt(expiration, 10) < Date.now()) return null;
    const payload = `${userId}.${expiration}`;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
    if (signature === expectedSignature) {
      return userId;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === verifyHash;
  } catch (error) {
    return false;
  }
}

// Middleware to parse json
app.use(express.json());

// Auth Middleware to protect routes (By-passed for direct usage)
const authenticateToken = (req: any, res: any, next: any) => {
  req.userId = "default-user";
  next();
};

// ==========================================
// API ROUTES
// ==========================================

// Register Route
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  const users = loadData<UserStoreItem[]>(USERS_FILE, []);
  const normalizedEmail = email.toLowerCase().trim();

  if (users.some((u) => u.email === normalizedEmail)) {
    return res.status(400).json({ error: "User with this email already exists" });
  }

  const newUser: UserStoreItem = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveData(USERS_FILE, users);

  const token = generateToken(newUser.id);
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    },
  });
});

// Login Route
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const users = loadData<UserStoreItem[]>(USERS_FILE, []);
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
});

// GET Google Auth URL
app.get("/api/auth/google/url", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({ 
      error: "Google Client ID is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the secrets dashboard in Google AI Studio." 
    });
  }

  const appUrl = process.env.APP_URL || `http://localhost:3000`;
  const redirectUri = `${appUrl}/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent"
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// Google OAuth Callback Handler
app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf9f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1e293b; }
            .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); max-width: 400px; text-align: center; border: 1px solid #f1f5f9; }
            h2 { color: #ef4444; margin-top: 0; font-size: 22px; }
            p { font-size: 14px; color: #64748b; line-height: 1.6; }
            button { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; margin-top: 20px; transition: all 0.2s; }
            button:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Failed</h2>
            <p>${error}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: "${error}" }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("No authorization code provided");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || `http://localhost:3000`;
  const redirectUri = `${appUrl}/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return res.status(500).send("Google OAuth Client ID or Client Secret is not configured.");
  }

  try {
    // 1. Exchange authorization code for token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string; id_token?: string };

    // 2. Fetch user information
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user info from Google");
    }

    const googleUser = (await userResponse.json()) as { sub: string; email: string; name: string; picture?: string };

    const email = googleUser.email.toLowerCase().trim();
    const name = googleUser.name || "Google User";

    const users = loadData<UserStoreItem[]>(USERS_FILE, []);
    let user = users.find((u) => u.email === email);

    if (!user) {
      // Create new user
      user = {
        id: crypto.randomUUID(),
        name: name,
        email: email,
        passwordHash: hashPassword(crypto.randomBytes(16).toString("hex")),
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      saveData(USERS_FILE, users);
    }

    const sessionToken = generateToken(user.id);
    const userDataJson = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });

    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf9f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1e293b; }
            .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); max-width: 400px; text-align: center; border: 1px solid #f1f5f9; }
            h2 { color: #10b981; margin-top: 0; font-size: 22px; }
            p { font-size: 14px; color: #64748b; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Successful!</h2>
            <p>Syncing session and closing window...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                token: "${sessionToken}", 
                user: ${userDataJson} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Google OAuth Error:", err);
    res.send(`
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf9f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1e293b; }
            .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); max-width: 400px; text-align: center; border: 1px solid #f1f5f9; }
            h2 { color: #ef4444; margin-top: 0; font-size: 22px; }
            p { font-size: 14px; color: #64748b; line-height: 1.6; }
            button { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; margin-top: 20px; transition: all 0.2s; }
            button:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Google Authentication Error</h2>
            <p>${err.message || "Unknown error occurred"}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: "${err.message || 'Unknown error'}" }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Get User Tasks
app.get("/api/tasks", authenticateToken, (req: any, res) => {
  const tasks = loadData<TaskStoreItem[]>(TASKS_FILE, []);
  const userTasks = tasks.filter((t) => t.userId === req.userId);
  res.json(userTasks);
});

// Create Task
app.post("/api/tasks", authenticateToken, (req: any, res) => {
  const { title, description, dueDate, priority, status, category } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Task title is required" });
  }

  const tasks = loadData<TaskStoreItem[]>(TASKS_FILE, []);
  const newTask: TaskStoreItem = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: (description || "").trim(),
    dueDate: dueDate || new Date().toISOString().split("T")[0],
    priority: priority || "medium",
    status: status || "pending",
    category: (category || "General").trim(),
    userId: req.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  saveData(TASKS_FILE, tasks);
  res.status(201).json(newTask);
});

// Update Task
app.put("/api/tasks/:id", authenticateToken, (req: any, res) => {
  const { title, description, dueDate, priority, status, category } = req.body;
  const taskId = req.params.id;

  const tasks = loadData<TaskStoreItem[]>(TASKS_FILE, []);
  const taskIndex = tasks.findIndex((t) => t.id === taskId && t.userId === req.userId);

  if (taskIndex === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  const existingTask = tasks[taskIndex];
  const updatedTask: TaskStoreItem = {
    ...existingTask,
    title: title !== undefined ? title.trim() : existingTask.title,
    description: description !== undefined ? description.trim() : existingTask.description,
    dueDate: dueDate !== undefined ? dueDate : existingTask.dueDate,
    priority: priority !== undefined ? priority : existingTask.priority,
    status: status !== undefined ? status : existingTask.status,
    category: category !== undefined ? category.trim() : existingTask.category,
    updatedAt: new Date().toISOString(),
  };

  tasks[taskIndex] = updatedTask;
  saveData(TASKS_FILE, tasks);
  res.json(updatedTask);
});

// Delete Task
app.delete("/api/tasks/:id", authenticateToken, (req: any, res) => {
  const taskId = req.params.id;
  const tasks = loadData<TaskStoreItem[]>(TASKS_FILE, []);
  const initialLength = tasks.length;

  const filteredTasks = tasks.filter((t) => !(t.id === taskId && t.userId === req.userId));

  if (filteredTasks.length === initialLength) {
    return res.status(404).json({ error: "Task not found" });
  }

  saveData(TASKS_FILE, filteredTasks);
  res.json({ message: "Task successfully deleted" });
});

// Get User Statistics
app.get("/api/stats", authenticateToken, (req: any, res) => {
  const tasks = loadData<TaskStoreItem[]>(TASKS_FILE, []);
  const userTasks = tasks.filter((t) => t.userId === req.userId);

  const total = userTasks.length;
  const completed = userTasks.filter((t) => t.status === "completed").length;
  const pending = userTasks.filter((t) => t.status === "pending").length;
  const inProgress = userTasks.filter((t) => t.status === "in_progress").length;

  const low = userTasks.filter((t) => t.priority === "low").length;
  const medium = userTasks.filter((t) => t.priority === "medium").length;
  const high = userTasks.filter((t) => t.priority === "high").length;

  res.json({
    total,
    completed,
    pending,
    inProgress,
    completedPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    byPriority: { low, medium, high },
  });
});

// ==========================================
// VITE MIDDLEWARE SETUP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
