# BullMQ-Zod

📦 Type-safe BullMQ integration with Zod schema validation

## Features

- 🔒 Type-safe job data and return types using Zod schemas
- ⚡ Seamless integration with BullMQ
- 🛡️ Runtime validation of job payloads
- 📝 TypeScript support out of the box
- 🚀 Zero runtime overhead when validation is disabled
- 🚀 Multiple job types in single queue

## Installation

```bash
npm install bullmq-zod bullmq zod
# or
yarn add bullmq-zod bullmq zod
# or
pnpm add bullmq-zod bullmq zod
```

## Usage

```typescript
import { createQueue } from 'bullmq-zod';
import { z } from 'zod';

// Define your job schemas
const jobSchemas = {
  sendEmail: z.object({
    to: z.string().email(),
    subject: z.string(),
    content: z.string(),
  }),
  
  processImage: z.object({
    imageUrl: z.string().url(),
    width: z.number().positive(),
    height: z.number().positive(),
    format: z.enum(['jpeg', 'png', 'webp']),
  }),
} as const;

// Create a type-safe queue
const queue = createQueue('my-queue', jobSchemas);

// Register job handlers
queue.registerHandler('sendEmail', async (job) => {
  const { to, subject, content } = job.data; // Fully typed!
  // Handle email sending
});

queue.registerHandler('processImage', async (job) => {
  const { imageUrl, width, height, format } = job.data; // Fully typed!
  // Handle image processing
});

// Start the worker
await queue.startWorker();

// Add jobs - all payloads are type-checked!
await queue.addJob('sendEmail', {
  to: 'user@example.com',
  subject: 'Hello',
  content: 'World',
});

await queue.addJob('processImage', {
  imageUrl: 'https://example.com/image.jpg',
  width: 800,
  height: 600,
  format: 'webp',
});

// TypeScript will catch invalid payloads at compile time
await queue.addJob('sendEmail', {
  to: 'invalid-email', // Type error!
  subject: 123, // Type error!
});

// Zod will catch invalid payloads at runtime
await queue.addJob('processImage', {
  imageUrl: 'not-a-url', // Runtime error!
  width: -100, // Runtime error!
  height: 600,
  format: 'invalid', // Runtime error!
});
```

## API Reference

### `createQueue`

Creates a type-safe BullMQ queue with Zod schema validation.

```typescript
function createQueue<T extends JobSchemaDefinition>(
  queueName: string,
  schemas: T,
  queueOptions?: QueueOptions
): TypedQueue<T>
```

### `TypedQueue`

The main queue class with type-safe methods.

```typescript
class TypedQueue<T extends JobSchemaDefinition> {
  // Add a job to the queue
  async addJob<K extends JobName<T>>(
    jobName: K,
    payload: JobPayloads<T>[K],
    jobOptions?: JobsOptions
  ): Promise<Job<JobPayloads<T>[K]>>;

  // Register a job handler
  registerHandler<K extends JobName<T>>(
    jobName: K,
    handler: JobHandler<T, K>
  ): void;

  // Start the worker
  async startWorker(
    workerOptions?: WorkerOptions,
    connection?: RedisConnection
  ): Promise<Worker>;

  // Get the underlying BullMQ Queue instance
  get queue(): Queue;

  // Get the underlying BullMQ Worker instance
  get worker(): Worker | null;

  // Close the queue and worker
  async close(): Promise<void>;
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [AprilNEA](https://github.com/AprilNEA)
