import { Hono } from "hono";
import { nanoid } from "nanoid";

// Define the environment with R2 bucket
export type Env = {
  BUCKET: R2Bucket;
};

const uploadRoutes = new Hono<{ Bindings: Env }>();

// Handle file uploads directly
uploadRoutes.post(async (c) => {
  try {
    // const key = c.req.param("key");
    const key = nanoid(10);

    // Make sure BUCKET is available
    if (!c.env.BUCKET) {
      console.error("R2 bucket binding is not available");
      return c.json(
        {
          success: false,
          error: "Storage service unavailable",
        },
        500
      );
    }

    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          success: false,
          error: "No file provided or invalid file",
        },
        400
      );
    }

    // Check if it's an image file
    if (!file.type.startsWith("image/")) {
      return c.json(
        {
          success: false,
          error: "Only image files are allowed",
        },
        400
      );
    }

    // Get file content as array buffer
    const fileBuffer = await file.arrayBuffer();

    // Store the file in R2 bucket with content type
    await c.env.BUCKET.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return c.json({
      success: true,
      message: `File ${key} uploaded successfully!`,
      filename: key,
      size: fileBuffer.byteLength,
      type: file.type,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return c.json(
      {
        success: false,
        error: "Failed to upload file",
      },
      500
    );
  }
});

// Get a file from R2 bucket
uploadRoutes.get("/:key", async (c) => {
  try {
    const key = c.req.param("key");

    // Make sure BUCKET is available
    if (!c.env.BUCKET) {
      console.error("R2 bucket binding is not available");
      return c.json(
        {
          success: false,
          error: "Storage service unavailable",
        },
        500
      );
    }

    // Get the file from R2 bucket
    const object = await c.env.BUCKET.get(key);

    if (object === null) {
      return c.json(
        {
          success: false,
          error: "File not found",
        },
        404
      );
    }

    // Set appropriate headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);

    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error("Error retrieving file:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve file",
      },
      500
    );
  }
});

// Delete a file from R2 bucket
uploadRoutes.delete("/:key", async (c) => {
  try {
    const key = c.req.param("key");

    // Make sure BUCKET is available
    if (!c.env.BUCKET) {
      console.error("R2 bucket binding is not available");
      return c.json(
        {
          success: false,
          error: "Storage service unavailable",
        },
        500
      );
    }

    // Delete the file from R2 bucket
    await c.env.BUCKET.delete(key);

    return c.json({
      success: true,
      message: `File ${key} deleted successfully!`,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete file",
      },
      500
    );
  }
});

export default uploadRoutes;
