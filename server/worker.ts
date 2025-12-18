import * as db from './db';
import { simulateScraping, scrapeChannels, isClientConnected, getRateLimitInfo } from './telegramClient';
import { classifyPendingMessages } from './aiClassifier';

// Worker configuration
const WORKER_CONFIG = {
  intervalHours: 6,
  maxChannelsPerRun: 50,
  messagesPerChannel: 100,
  classifyBatchSize: 20,
  retryAttempts: 3,
  retryDelayMs: 5000,
};

interface WorkerStatus {
  isRunning: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  totalRuns: number;
  totalMessagesCollected: number;
  totalClassified: number;
  errors: string[];
}

let workerStatus: WorkerStatus = {
  isRunning: false,
  lastRunAt: null,
  nextRunAt: null,
  totalRuns: 0,
  totalMessagesCollected: 0,
  totalClassified: 0,
  errors: [],
};

let workerInterval: NodeJS.Timeout | null = null;

/**
 * Execute a single worker run
 */
export async function runWorker(userId: number): Promise<{
  success: boolean;
  messagesCollected: number;
  messagesClassified: number;
  errors: string[];
}> {
  const result = {
    success: false,
    messagesCollected: 0,
    messagesClassified: 0,
    errors: [] as string[],
  };

  if (workerStatus.isRunning) {
    result.errors.push('Worker already running');
    return result;
  }

  workerStatus.isRunning = true;
  workerStatus.lastRunAt = new Date();
  
  console.log('[Worker] Starting scheduled run...');

  try {
    // 1. Get active channels
    const channels = await db.getChannels(userId);
    const activeChannels = channels
      .filter(c => c.isActive)
      .slice(0, WORKER_CONFIG.maxChannelsPerRun);

    if (activeChannels.length === 0) {
      result.errors.push('No active channels found');
      return result;
    }

    console.log(`[Worker] Found ${activeChannels.length} active channels`);

    // 2. Create scraping history entry
    const historyEntry = await db.createScrapingHistory({
      userId,
      channelId: 0, // All channels
      status: 'running',
      messagesCollected: 0,
      imagesCollected: 0,
      videosCollected: 0,
      promptsCollected: 0,
    });

    // 3. Scrape channels
    const channelUsernames = activeChannels
      .map(c => c.channelUsername || c.channelName)
      .filter(Boolean) as string[];

    let scrapingResult;
    
    if (isClientConnected()) {
      // Real scraping with Telegram API
      scrapingResult = await scrapeChannels(
        userId,
        channelUsernames,
        WORKER_CONFIG.messagesPerChannel
      );
    } else {
      // Simulated scraping for testing
      console.log('[Worker] Using simulated scraping (Telegram not connected)');
      scrapingResult = await simulateScraping(
        userId,
        channelUsernames,
        Math.min(10, WORKER_CONFIG.messagesPerChannel)
      );
    }

    result.messagesCollected = scrapingResult.messagesCollected;
    result.errors.push(...scrapingResult.errors);

    console.log(`[Worker] Collected ${scrapingResult.messagesCollected} messages`);

    // 4. Classify pending messages
    const classified = await classifyPendingMessages(WORKER_CONFIG.classifyBatchSize);
    result.messagesClassified = classified;

    console.log(`[Worker] Classified ${classified} messages`);

    // 5. Update history entry
    await db.updateScrapingHistory(historyEntry.id, {
      status: 'completed',
      messagesCollected: scrapingResult.messagesCollected,
      completedAt: new Date(),
    });

    // 6. Update worker stats
    workerStatus.totalRuns++;
    workerStatus.totalMessagesCollected += scrapingResult.messagesCollected;
    workerStatus.totalClassified += classified;
    
    result.success = scrapingResult.errors.length === 0;

    // Log rate limit info
    const rateInfo = getRateLimitInfo();
    console.log(`[Worker] Rate limit: ${rateInfo.used}/${rateInfo.limit} (${rateInfo.remaining} remaining)`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMsg);
    workerStatus.errors.push(`${new Date().toISOString()}: ${errorMsg}`);
    console.error('[Worker] Error:', errorMsg);
  } finally {
    workerStatus.isRunning = false;
    workerStatus.nextRunAt = new Date(Date.now() + WORKER_CONFIG.intervalHours * 60 * 60 * 1000);
  }

  return result;
}

/**
 * Start the automatic worker with interval
 */
export function startWorker(userId: number): boolean {
  if (workerInterval) {
    console.log('[Worker] Already running');
    return false;
  }

  console.log(`[Worker] Starting automatic worker (every ${WORKER_CONFIG.intervalHours} hours)`);

  // Run immediately
  runWorker(userId);

  // Schedule recurring runs
  workerInterval = setInterval(
    () => runWorker(userId),
    WORKER_CONFIG.intervalHours * 60 * 60 * 1000
  );

  workerStatus.nextRunAt = new Date(Date.now() + WORKER_CONFIG.intervalHours * 60 * 60 * 1000);

  return true;
}

/**
 * Stop the automatic worker
 */
export function stopWorker(): boolean {
  if (!workerInterval) {
    console.log('[Worker] Not running');
    return false;
  }

  clearInterval(workerInterval);
  workerInterval = null;
  workerStatus.nextRunAt = null;

  console.log('[Worker] Stopped');
  return true;
}

/**
 * Get current worker status
 */
export function getWorkerStatus(): WorkerStatus {
  return { ...workerStatus };
}

/**
 * Update worker configuration
 */
export function updateWorkerConfig(config: Partial<typeof WORKER_CONFIG>): void {
  Object.assign(WORKER_CONFIG, config);
  console.log('[Worker] Config updated:', WORKER_CONFIG);
}

/**
 * Check if worker is currently running
 */
export function isWorkerRunning(): boolean {
  return workerStatus.isRunning;
}

/**
 * Get worker configuration
 */
export function getWorkerConfig(): typeof WORKER_CONFIG {
  return { ...WORKER_CONFIG };
}

/**
 * Clear worker errors
 */
export function clearWorkerErrors(): void {
  workerStatus.errors = [];
}

/**
 * Reset worker statistics
 */
export function resetWorkerStats(): void {
  workerStatus.totalRuns = 0;
  workerStatus.totalMessagesCollected = 0;
  workerStatus.totalClassified = 0;
  workerStatus.errors = [];
}
