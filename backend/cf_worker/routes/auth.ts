import { Hono } from "hono";
import { Bindings, UserRow, UserSettingsRow } from "../types";
import { hashPassword, verifyPassword, createJWT, verifyJWT } from "../lib/crypto";

export const authRoutes = new Hono<{ Bindings: Bindings }>();

// Helper to extract current user from Authorization header or Cookie
export async function getAuthUser(c: any): Promise<{ id: number; email: string; username: string } | null> {
  const secret = c.env.JWT_SECRET || "kuromi_super_secret_jwt_key_cf_worker_2026";
  const authHeader = c.req.header("Authorization");
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else {
    const cookieHeader = c.req.header("Cookie") || "";
    const cookieName = c.env.COOKIE_NAME || "kuromi_token";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((p: string) => {
        const [k, ...v] = p.trim().split("=");
        return [k, v.join("=")];
      })
    );
    token = cookies[cookieName] || "";
  }

  if (!token) return null;
  const payload = await verifyJWT(token, secret);
  if (!payload || !payload.sub) return null;

  return {
    id: parseInt(payload.sub, 10),
    email: payload.email,
    username: payload.username,
  };
}

// POST /register
authRoutes.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, username, password } = body;

  if (!email || !username || !password) {
    return c.json({ error: "ValidationError", detail: "Email, username, and password are required" }, 400);
  }

  // Check if email or username exists
  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email = ?1 OR username = ?2 LIMIT 1"
  )
    .bind(email.toLowerCase(), username.toLowerCase())
    .first();

  if (existing) {
    return c.json({ error: "ConflictError", detail: "Email or username is already registered" }, 400);
  }

  const hashed = await hashPassword(password);
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

  // Insert user
  const result = await c.env.DB.prepare(
    "INSERT INTO users (email, username, hashed_password, avatar) VALUES (?1, ?2, ?3, ?4)"
  )
    .bind(email.toLowerCase(), username, hashed, avatar)
    .run();

  const userId = result.meta.last_row_id;

  // Insert default settings
  await c.env.DB.prepare(
    "INSERT INTO user_settings (user_id) VALUES (?1)"
  )
    .bind(userId)
    .run();

  const secret = c.env.JWT_SECRET || "kuromi_super_secret_jwt_key_cf_worker_2026";
  const expireSec = parseInt(c.env.ACCESS_TOKEN_EXPIRE_SECONDS || "604800", 10);
  const token = await createJWT({ sub: String(userId), email, username }, secret, expireSec);

  const cookieName = c.env.COOKIE_NAME || "kuromi_token";
  c.header("Set-Cookie", `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expireSec}`);

  return c.json(
    {
      accessToken: token,
      tokenType: "bearer",
      user: {
        id: userId,
        email,
        username,
        avatar,
        createdAt: new Date().toISOString(),
      },
    },
    201
  );
});

// POST /login
authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "ValidationError", detail: "Email and password are required" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE email = ?1 OR username = ?1 LIMIT 1"
  )
    .bind(email.toLowerCase())
    .first<UserRow>();

  if (!user || !(await verifyPassword(password, user.hashed_password))) {
    return c.json({ error: "Unauthorized", detail: "Incorrect email or password" }, 401);
  }

  const secret = c.env.JWT_SECRET || "kuromi_super_secret_jwt_key_cf_worker_2026";
  const expireSec = parseInt(c.env.ACCESS_TOKEN_EXPIRE_SECONDS || "604800", 10);
  const token = await createJWT({ sub: String(user.id), email: user.email, username: user.username }, secret, expireSec);

  const cookieName = c.env.COOKIE_NAME || "kuromi_token";
  c.header("Set-Cookie", `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expireSec}`);

  return c.json({
    accessToken: token,
    tokenType: "bearer",
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      createdAt: user.created_at,
    },
  });
});

// POST /logout
authRoutes.post("/logout", async (c) => {
  const cookieName = c.env.COOKIE_NAME || "kuromi_token";
  c.header("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
  return c.json({ message: "Successfully logged out" });
});

// GET /me
authRoutes.get("/me", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) {
    return c.json(null);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email, username, avatar, created_at FROM users WHERE id = ?1 LIMIT 1"
  )
    .bind(authUser.id)
    .first<UserRow>();

  if (!user) return c.json(null);

  const settings = await c.env.DB.prepare(
    "SELECT title_language, theme_accent, adult_filter FROM user_settings WHERE user_id = ?1 LIMIT 1"
  )
    .bind(user.id)
    .first<UserSettingsRow>();

  return c.json({
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    createdAt: user.created_at,
    settings: settings
      ? {
          titleLanguage: settings.title_language,
          themeAccent: settings.theme_accent,
          adultFilter: Boolean(settings.adult_filter),
        }
      : {
          titleLanguage: "english",
          themeAccent: "#8b7cf6",
          adultFilter: true,
        },
  });
});
