import { Queue, Worker, Job, QueueOptions, JobsOptions, WorkerOptions, RedisConnection } from 'bullmq';
import { z } from 'zod';

/**
 * 定义通用的 Schema 类型
 * @template K - JobName<T>
 */
export type JobSchemaDefinition = {
  [K: string]: z.ZodType<any>;
};

/**
 * 从 schema 定义中推导出 job 名称和 payload 类型
 * @template T - JobSchemaDefinition
 */
export type JobName<T extends JobSchemaDefinition> = keyof T;
export type JobPayloads<T extends JobSchemaDefinition> = {
  [K in keyof T]: z.infer<T[K]>;
};

/**
 * 定义 Job 处理器的类型
 * @template T - JobSchemaDefinition
 * @template K - JobName<T>
 */
export type JobHandler<
  T extends JobSchemaDefinition,
  K extends JobName<T>
> = (job: Job<JobPayloads<T>[K]>) => Promise<void>;

/**
 * 类型安全的 BullMQ 队列类
 * @template T - JobSchemaDefinition
 */
export class TypedQueue<T extends JobSchemaDefinition> {
  private _queue: Queue;
  private _worker: Worker | null = null;
  private schemas: T;
  private handlers: Map<JobName<T>, JobHandler<T, any>>;

  constructor(queueName: string, schemas: T, queueOptions?: QueueOptions) {
    this._queue = new Queue(queueName, queueOptions);
    this.handlers = new Map();
    this.schemas = schemas;
  }

  /**
   * 添加特定类型的 job
   * @param {K} jobName - job 名称
   * @param {JobPayloads<T>[K]} payload - job 数据
   * @param {JobsOptions} jobOptions - job 选项
   * @returns {Promise<Job<JobPayloads<T>[K]>>} 添加的 job 实例
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
   * 注册 job 处理器
   * @param {K} jobName - job 名称
   * @param {JobHandler<T, K>} handler - job 处理器
   */
  registerHandler<K extends JobName<T>>(
    jobName: K,
    handler: JobHandler<T, K>
  ) {
    this.handlers.set(jobName, handler);
  }

  /**
   * 启动 worker 处理 jobs
   * @param {WorkerOptions} 可选的 worker 选项
   * @param {typeof RedisConnection} connection - 可选的 Redis 连接
   * @returns {Worker} 启动的 worker 实例
   */
  async startWorker(workerOptions?: WorkerOptions, connection?: typeof RedisConnection) {
    if (this._worker) {
      throw new Error('Worker already started');
    }

    this._worker = new Worker(
      this._queue.name,
      async (job: Job<JobPayloads<T>[any]>) => {
        const handler = this.handlers.get(job.name as JobName<T>);
        if (!handler) {
          throw new Error(`No handler registered for job type: ${job.name}`);
        }
        
        await handler(job);
      },
      workerOptions,
      connection
    );

    return this._worker;
  }

  /**
   * @returns {Queue} 原始队列实例
   */
  get queue() {
    return this._queue;
  }

  /**
   * @returns {Worker} 原始 worker 实例
   */
  get worker() {
    return this._worker;
  }

  /**
   * 关闭队列和 worker
   */
  async close() {
    if (this._worker) {
      await this._worker.close();
    }
    await this._queue.close();
  }
}

/**
 * 创建队列的工厂函数
 * @template T - JobSchemaDefinition
 * @param {string} queueName - 队列名称
 * @param {T} schemas - job schemas
 * @param {QueueOptions} queueOptions - 队列选项
 * @returns {TypedQueue<T>} 创建的队列实例
 */
export function createQueue<T extends JobSchemaDefinition>(
  queueName: string,
  schemas: T,
  queueOptions?: QueueOptions
) {
  return new TypedQueue(queueName, schemas, queueOptions);
}

