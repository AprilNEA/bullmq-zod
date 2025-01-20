import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createQueue } from './index';
import { Queue, Worker } from 'bullmq';
import { z } from 'zod';

// Mock BullMQ
vi.mock('bullmq', () => {
  const Queue = vi.fn();
  Queue.prototype.add = vi.fn();
  Queue.prototype.close = vi.fn();

  const Worker = vi.fn();
  Worker.prototype.close = vi.fn();

  return { Queue, Worker };
});

describe('TypedQueue', () => {
  const testSchemas = {
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

  let queue: ReturnType<typeof createQueue<typeof testSchemas>>;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = createQueue('test-queue', testSchemas);
  });

  afterEach(async () => {
    await queue.close();
  });

  describe('addJob', () => {
    it('should add email job with valid payload', async () => {
      const emailPayload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
      };

      await queue.addJob('sendEmail', emailPayload);

      expect(Queue.prototype.add).toHaveBeenCalledWith(
        'sendEmail',
        emailPayload,
        undefined
      );
    });

    it('should throw error for invalid email payload', async () => {
      const invalidPayload = {
        to: 'invalid-email',
        subject: 'Test',
        content: 'Test',
      };

      await expect(
        queue.addJob('sendEmail', invalidPayload)
      ).rejects.toThrow();
    });

    it('should add image processing job with valid payload', async () => {
      const imagePayload = {
        imageUrl: 'https://example.com/image.jpg',
        width: 100,
        height: 100,
        format: 'jpeg' as const,
      };

      await queue.addJob('processImage', imagePayload);

      expect(Queue.prototype.add).toHaveBeenCalledWith(
        'processImage',
        imagePayload,
        undefined
      );
    });

    it('should throw error for invalid image payload', async () => {
      const invalidPayload = {
        imageUrl: 'not-a-url',
        width: -100,
        height: 100,
        format: 'invalid-format' as any,
      };

      await expect(
        queue.addJob('processImage', invalidPayload)
      ).rejects.toThrow();
    });
  });

  describe('registerHandler', () => {
    it('should register handler for job type', async () => {
      const handler = vi.fn();
      queue.registerHandler('sendEmail', handler);

      const worker = await queue.startWorker();
      expect(Worker).toHaveBeenCalled();

      // 模拟执行 worker 处理函数
      const processFn = (Worker as any).mock.calls[0][1];
      const mockJob = {
        name: 'sendEmail',
        data: {
          to: 'test@example.com',
          subject: 'Test',
          content: 'Test',
        },
      };

      await processFn(mockJob);
      expect(handler).toHaveBeenCalledWith(mockJob);
    });

    it('should throw error when handler not found', async () => {
      await queue.startWorker();
      const processFn = (Worker as any).mock.calls[0][1];
      const mockJob = {
        name: 'unknownJob',
        data: {},
      };

      await expect(processFn(mockJob)).rejects.toThrow(
        'No handler registered for job type: unknownJob'
      );
    });
  });

  describe('worker', () => {
    it('should validate job data in worker', async () => {
      const handler = vi.fn();
      queue.registerHandler('sendEmail', handler);
      await queue.startWorker();

      const processFn = (Worker as any).mock.calls[0][1];
      const invalidJob = {
        name: 'sendEmail',
        data: {
          to: 'invalid-email',
          subject: 'Test',
          content: 'Test',
        },
      };

      await expect(processFn(invalidJob)).rejects.toThrow();
    });

    it('should not start worker twice', async () => {
      await queue.startWorker();
      await expect(queue.startWorker()).rejects.toThrow('Worker already started');
    });
  });

  describe('queue management', () => {
    it('should close queue and worker', async () => {
      await queue.startWorker();
      await queue.close();

      expect(Queue.prototype.close).toHaveBeenCalled();
      expect(Worker.prototype.close).toHaveBeenCalled();
    });

    it('should get queue instance', () => {
      const queueInstance = queue.queue;
      expect(queueInstance).toBeInstanceOf(Queue);
    });

    it('should get worker instance after starting', async () => {
      expect(queue.worker).toBeNull();
      await queue.startWorker();
      expect(queue.worker).toBeInstanceOf(Worker);
    });
  });
}); 