import { Queue, Worker, type Job, type QueueOptions, type JobsOptions, type WorkerOptions, type ConnectionOptions } from 'bullmq';
import type { z } from 'zod';

/**
 * Define a generic Schema type
 * @template K - JobName<T>
 */
export type JobSchemaDefinition = {
  // biome-ignore lint/suspicious/noExplicitAny: anything
    [K: string]: z.ZodType<any>;
};

/**
 * Derive job names and payload types from schema definition
 * @template T - JobSchemaDefinition
 */
export type JobName<T extends JobSchemaDefinition> = keyof T;
export type JobPayloads<T extends JobSchemaDefinition> = {
  [K in keyof T]: z.infer<T[K]>;
};

/**
 * Define job handler type
 * @template T - JobSchemaDefinition
 * @template K - JobName<T>
 */
export type JobHandler<
  T extends JobSchemaDefinition,
  K extends JobName<T>
> = (job: Job<JobPayloads<T>[K]>) => Promise<void>;

/**
 * Type-safe BullMQ queue class
 * @template T - JobSchemaDefinition
 */
export class TypedQueue<T extends JobSchemaDefinition> {
  private _queue: Queue;
  private _worker: Worker | null = null;
  private schemas: T;
  // biome-ignore lint/suspicious/noExplicitAny: unknown when job is created
  private handlers: Map<JobName<T>, JobHandler<T, any>>;

  constructor(queueName: string, schemas: T, private readonly connection: ConnectionOptions, queueOptions?: QueueOptions) {
    this._queue = new Queue(queueName, {
      connection: this.connection,
      ...queueOptions,
    });
    this.handlers = new Map();
    this.schemas = schemas;
  }

  /**
   * Add a job of specific type
   * @param {K} jobName - Job name
   * @param {JobPayloads<T>[K]} payload - Job data
   * @param {JobsOptions} jobOptions - Job options
   * @returns {Promise<Job<JobPayloads<T>[K]>>} Added job instance
   */
  async addJob<K extends JobName<T>>(
    jobName: K,
    payload: JobPayloads<T>[K],
    jobOptions?: JobsOptions
  ) {
    const schema = this.schemas[jobName];
    const validatedData = schema.parse(payload);

    return this._queue.add(jobName as string, validatedData, jobOptions);
  }

  /**
   * Register job handler
   * @param {K} jobName - Job name
   * @param {JobHandler<T, K>} handler - Job handler
   */
  registerHandler<K extends JobName<T>>(
    jobName: K,
    handler: JobHandler<T, K>
  ) {
    this.handlers.set(jobName, handler);
  }

  /**
   * Initialize worker to process jobs
   * @param {WorkerOptions} Optional worker options
   * @returns {Worker} Initialized worker instance
   */
  initWorker(workerOptions?: WorkerOptions) {
    if (this._worker) {
      throw new Error('Worker already started');
    }
    this._worker = new Worker(
      this._queue.name,
      // biome-ignore lint/suspicious/noExplicitAny: unknown when job is created
      async (job: Job<JobPayloads<T>[any]>) => {
        const handler = this.handlers.get(job.name as JobName<T>);
        if (!handler) {
          throw new Error(`No handler registered for job type: ${job.name}`);
        }

        await handler(job);
      },
      {
        autorun: false,
        connection: this.connection,
        ...workerOptions,
      }
    );

    return this._worker;
  }

  async startWorker() {
    if (!this._worker) {
      throw new Error("Worker not initialized");
    }
    await this._worker.run();
  }
  /**
   * @returns {Queue} Original queue instance
   */
  get queue() {
    return this._queue;
  }

  /**
   * @returns {Worker} Original worker instance
   */
  get worker() {
    return this._worker;
  }

  /**
   * Close queue and worker
   */
  async close() {
    if (this._worker) {
      await this._worker.close();
    }
    await this._queue.close();
  }
}