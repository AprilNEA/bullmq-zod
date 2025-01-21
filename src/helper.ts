import { TypedQueue, type JobSchemaDefinition } from ".";
import type { ConnectionOptions, QueueOptions } from "bullmq";

/**
 * Factory function to create queue
 * @template T - JobSchemaDefinition
 * @param {string} queueName - Queue name
 * @param {T} schemas - Job schemas
 * @param {ConnectionOptions} connection - Connection options
 * @param {QueueOptions} queueOptions - Queue options
 * @returns {TypedQueue<T>} Created queue instance
 */
export function createQueue<T extends JobSchemaDefinition>(
  queueName: string,
  schemas: T,
  connection: ConnectionOptions,
  queueOptions?: QueueOptions
) {
  return new TypedQueue(queueName, schemas, connection, queueOptions);
}

/**
 * Helper function to create a queue factory
 * @param {ConnectionOptions} connection - Connection options
 * @param {QueueOptions} queueOptions - Queue options
 * @returns {(queueName: string, schemas: JobSchemaDefinition) => TypedQueue<JobSchemaDefinition>} Queue factory
 */
export function createQueueHelper(
  connection: ConnectionOptions,
  queueOptions?: QueueOptions
) {
  return (queueName: string, schemas: JobSchemaDefinition) =>
    createQueue(queueName, schemas, connection, queueOptions);
}
