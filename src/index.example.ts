import { z } from "zod";
import { createQueue } from ".";

// 使用示例：
async function example() {
  // 定义 job schemas
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

    sendNotification: z.object({
      userId: z.string(),
      title: z.string(),
      message: z.string(),
      type: z.enum(['push', 'sms', 'in-app']),
    }),
  } as const;

  // 创建一个处理多种任务的队列
  const workQueue = createQueue('work-queue', jobSchemas);
  
  // 注册不同类型的 job 处理器
  workQueue.registerHandler('sendEmail', async (job) => {
    const { to, subject, content } = job.data;
    console.log(`Sending email to ${to}`);
  });

  workQueue.registerHandler('processImage', async (job) => {
    const { imageUrl, width, height, format } = job.data;
    console.log(`Processing image ${imageUrl}`);
  });

  workQueue.registerHandler('sendNotification', async (job) => {
    const { userId, title, message, type } = job.data;
    console.log(`Sending ${type} notification to ${userId}`);
  });

  // 启动 worker
  await workQueue.startWorker();

  // 添加不同类型的 jobs
  await workQueue.addJob('sendEmail', {
    to: 'user@example.com',
    subject: 'Hello',
    content: 'World',
  });

  await workQueue.addJob('processImage', {
    imageUrl: 'https://example.com/image.jpg',
    width: 800,
    height: 600,
    format: 'webp',
  });

  await workQueue.addJob('sendNotification', {
    userId: 'user123',
    title: 'New Message',
    message: 'You have a new message',
    type: 'push',
  });
}
