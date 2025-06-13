# Towber API

A Cloudflare Workers API built with Hono.js and TypeScript, providing backend services for the Towber application.

## Features

- 🚀 **Cloudflare Workers** - Serverless edge computing
- 🔥 **Hono.js** - Fast, lightweight web framework
- 📦 **Bun** - Fast JavaScript runtime and package manager
- 🗄️ **Drizzle ORM** - Type-safe database operations
- 🔐 **Authentication** - User auth system
- 💳 **Stripe Integration** - Payment processing
- 📱 **Telegram Bot** - Notifications
- 💬 **WeChat Integration** - Social login
- 📁 **R2 Storage** - File uploads and storage
- 🔗 **QR Code Generation** - Dynamic QR codes

## API Endpoints

- `/api/health` - Health check endpoint
- `/api/orders` - Order management
- `/api/upload` - File upload handling
- `/api/auth` - Authentication
- `/api/qrcode` - QR code generation

## Prerequisites

- [Bun](https://bun.sh) - Fast JavaScript runtime
- [Cloudflare Workers account](https://workers.cloudflare.com)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler)

## Installation

Install dependencies using Bun:

```bash
bun install
```

## Development

Start the development server:

```bash
bun run dev
```

This will start the Wrangler development server with hot reloading.

## Database

The project uses Drizzle ORM for database operations. Available database commands:

```bash
# Generate database migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Push schema changes
bun run db:push
```

## Deployment

Deploy to Cloudflare Workers using Bun:

```bash
bun run deploy
```

This command will:

- Build and minify your code
- Deploy to Cloudflare Workers
- Update your worker with the latest changes

## Environment Variables

Create a `.dev.vars` file for local development with the following variables:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
TELEGRAM_TEST_CHAT_ID=your_test_chat_id
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

For production, set these variables in the Cloudflare Workers dashboard or use `wrangler secret put`.

## Configuration

The project configuration is managed through `wrangler.json`:

- **R2 Buckets**: Configured for file storage
- **Node.js Compatibility**: Enabled for broader package support
- **Observability**: Logging enabled for monitoring

## Project Structure

```
towber-api/
├── src/
│   ├── index.ts          # Main application entry point
│   ├── routes/           # API route handlers
│   ├── db/              # Database schema and configuration
│   └── middleware/      # Custom middleware
├── wrangler.json        # Cloudflare Workers configuration
├── drizzle.config.ts    # Drizzle ORM configuration
├── package.json         # Dependencies and scripts
└── README.md           # Project documentation
```

## Technologies Used

- **Runtime**: Bun
- **Framework**: Hono.js
- **Platform**: Cloudflare Workers
- **Database**: Drizzle ORM
- **Storage**: Cloudflare R2
- **Payments**: Stripe
- **Notifications**: Telegram Bot API
- **Social**: WeChat API

```
npm install
npm run dev
```

```
npm run deploy
```

// "compatibility_flags": [
// "nodejs_compat"
// ],

// "kv_namespaces": [
// {
// "binding": "MY_KV_NAMESPACE",
// "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
// }
// ],
// "r2_buckets": [
// {
// "binding": "MY_BUCKET",
// "bucket_name": "my-bucket"
// }
// ],
// "d1_databases": [
// {
// "binding": "MY_DB",
// "database_name": "my-database",
// "database_id": ""
// }
// ],
// "ai": {
// "binding": "AI"
// },
// "observability": {
// "enabled": true,
// "head_sampling_rate": 1
// }
