import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import axios from "axios";

// Define environment bindings
export type Bindings = {
  WECHAT_APP_ID: string;
  WECHAT_APP_SECRET: string;
};

// Create a new Hono app for auth routes
const auth = new Hono<{ Bindings: Bindings }>();

// Validation schema for login request
const loginSchema = z.object({
  code: z.string().min(1),
  appId: z.string().min(1),
  appSecret: z.string().min(1),
});

// Login endpoint
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { code, appId, appSecret } = c.req.valid("json");

    // Verify that the provided appId and appSecret match the environment variables
    if (
      appId !== c.env.WECHAT_APP_ID ||
      appSecret !== c.env.WECHAT_APP_SECRET
    ) {
      return c.json({ error: "Invalid app credentials" }, 401);
    }

    // Call WeChat API to exchange code for session info
    const response = await axios.get(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
    );

    const { openid, session_key, unionid, errcode, errmsg } = response.data;

    // Check for WeChat API errors
    if (errcode) {
      console.error(`WeChat API error: ${errcode} - ${errmsg}`);
      return c.json(
        { error: "WeChat authentication failed", details: errmsg },
        400
      );
    }

    // Return the session information
    return c.json({
      openid,
      session_key,
      unionid,
      // You might want to generate a custom session token here
      // and store the WeChat session info in your database
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
});

// Get access token endpoint
auth.get("/access-token", async (c) => {
  try {
    // Call WeChat API to get access token
    const response = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${c.env.WECHAT_APP_ID}&secret=${c.env.WECHAT_APP_SECRET}`
    );

    const { access_token, expires_in, errcode, errmsg } = response.data;

    // Check for WeChat API errors
    if (errcode) {
      console.error(`WeChat API error: ${errcode} - ${errmsg}`);
      return c.json(
        { error: "Failed to get access token", details: errmsg },
        400
      );
    }

    // Return the access token information
    return c.json({
      access_token,
      expires_in,
    });
  } catch (error) {
    console.error("Get access token error:", error);
    return c.json({ error: "Failed to get access token" }, 500);
  }
});

export default auth;
