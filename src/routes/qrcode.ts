import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import axios from "axios";

// Define environment bindings
export type Bindings = {
  WECHAT_APP_ID: string;
  WECHAT_APP_SECRET: string;
};

// Create a new Hono app for qrcode routes
const qrcode = new Hono<{ Bindings: Bindings }>();

// Validation schema for QR code request
const qrCodeSchema = z.object({
  path: z.string().min(1).max(1024),
  width: z.number().min(280).max(1280).optional().default(430),
  auto_color: z.boolean().optional().default(false),
  line_color: z
    .object({
      r: z.number().min(0).max(255),
      g: z.number().min(0).max(255),
      b: z.number().min(0).max(255),
    })
    .optional()
    .default({ r: 0, g: 0, b: 0 }),
  is_hyaline: z.boolean().optional().default(false),
  env_version: z
    .enum(["release", "trial", "develop"])
    .optional()
    .default("release"),
});

// Get QR code endpoint
qrcode.post("/", zValidator("json", qrCodeSchema), async (c) => {
  try {
    const data = c.req.valid("json");

    // First, get the access token
    const tokenResponse = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${c.env.WECHAT_APP_ID}&secret=${c.env.WECHAT_APP_SECRET}`
    );

    const {
      access_token,
      errcode: tokenErrcode,
      errmsg: tokenErrmsg,
    } = tokenResponse.data;

    // Check for token errors
    if (tokenErrcode) {
      console.error(`WeChat API error: ${tokenErrcode} - ${tokenErrmsg}`);
      return c.json(
        { error: "Failed to get access token", details: tokenErrmsg },
        400
      );
    }

    // Call WeChat API to get QR code
    const response = await axios.post(
      `https://api.weixin.qq.com/wxa/getwxacode?access_token=${access_token}`,
      data,
      { responseType: "arraybuffer" }
    );

    // Check if the response is an error (JSON) or an image (Buffer)
    const contentType = response.headers["content-type"];

    if (contentType && contentType.includes("application/json")) {
      // It's an error response
      const errorData = JSON.parse(response.data.toString());
      console.error(
        `WeChat API error: ${errorData.errcode} - ${errorData.errmsg}`
      );
      return c.json(
        { error: "Failed to generate QR code", details: errorData.errmsg },
        400
      );
    }

    // It's an image, return it
    return new Response(response.data, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="qrcode.png"',
      },
    });
  } catch (error) {
    console.error("QR code generation error:", error);
    return c.json({ error: "Failed to generate QR code" }, 500);
  }
});

export default qrcode;
