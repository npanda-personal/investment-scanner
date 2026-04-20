/**
 * Session Storage Service for Real-Time Scanner
 * 
 * Hybrid storage system:
 * - Redis: Fast session access, progress tracking, result caching
 * - PostgreSQL: Persistent session history, audit trail
 * 
 * Key features:
 * - Session lifecycle management
 * - Progress tracking with TTL
 * - Result caching with automatic cleanup
 * - Fallback to in-memory storage when Redis is unavailable
 */

import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { ScanSession, ScoredOpportunity, ScanProgressResponse } from '../types/scanner-extended';

// Default Redis TTLs (in seconds)
const SESSION_TTL = 3600; // 1 hour for active sessions
const RESULT_TTL = 86400; // 24 hours for cached results
const PROGRESS_TTL = 300; // 5 minutes for progress updates

// Redis key patterns
const SESSION_KEY = (sessionId: string) => `scanner:session:${sessionId}`;
const PROGRESS_KEY = (sessionId: string) => `scanner:progress:${sessionId}`;
const RESULT_KEY = (sessionId: string) => `scanner:result:${sessionId}`;
const USER_SESSIONS_KEY = (userId: string) => `scanner:user_sessions:${userId}`;

export interface SessionStorageOptions {
  redisUrl?: string;
  enableRedis?: boolean;
  fallbackToMemory?: boolean;
}

export class SessionStorageService {
  private redisClient: IORedis | null = null;
  private prisma: PrismaClient;
  private options: SessionStorageOptions;
  private memoryStore: Map<string, any> = new Map();
  private isRedisConnected = false;

  constructor(prisma: PrismaClient, options: SessionStorageOptions = {}) {
    this.prisma = prisma;
    this.options = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      enableRedis: true,
      fallbackToMemory: true,
      ...options
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    if (!this.options.enableRedis) {
      console.log('SessionStorage: Redis disabled, using memory store');
      return;
    }

    try {
      this.redisClient = new IORedis(this.options.redisUrl!);

      // Test connection
      await this.redisClient.ping();
      this.isRedisConnected = true;
      console.log('SessionStorage: Redis connected successfully');
      
      // Handle connection errors
      this.redisClient.on('error', (error: Error) => {
        console.error('SessionStorage: Redis connection error:', error.message);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('SessionStorage: Redis reconnected');
        this.isRedisConnected = true;
      });

    } catch (error) {
      console.error('SessionStorage: Failed to connect to Redis:', error);
      this.isRedisConnected = false;
      this.redisClient = null;
    }
  }

  /**
   * Get storage client (Redis if available, otherwise memory)
   */
  private getStorageClient(): 'redis' | 'memory' {
    return this.isRedisConnected && this.redisClient ? 'redis' : 'memory';
  }

  /**
   * Create a new scan session
   */
  async createSession(session: Omit<ScanSession, 'id' | 'startedAt' | 'status' | 'metadata'> & { id?: string }): Promise<ScanSession> {
    const sessionId = session.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const fullSession: ScanSession = {
      id: sessionId,
      userId: session.userId,
      scopeType: session.scopeType,
      scopeData: session.scopeData,
      status: 'PENDING',
      startedAt: now,
      results: [],
      metadata: {
        symbolsScanned: 0,
        durationMs: 0,
        signalsDetected: 0,
        apiCallsMade: 0,
        cacheHitRate: 0,
        errorCount: 0,
      },
    };

    // Store in Redis (fast access)
    if (this.getStorageClient() === 'redis') {
      await this.redisClient!.setex(
        SESSION_KEY(sessionId),
        SESSION_TTL,
        JSON.stringify(fullSession)
      );
      
      // Add to user's session list
      await this.redisClient!.sadd(USER_SESSIONS_KEY(session.userId), sessionId);
      await this.redisClient!.expire(USER_SESSIONS_KEY(session.userId), SESSION_TTL * 2);
    } else {
      // Store in memory
      this.memoryStore.set(SESSION_KEY(sessionId), fullSession);
      
      // Track user sessions in memory
      const userSessions = this.memoryStore.get(USER_SESSIONS_KEY(session.userId)) || [];
      userSessions.push(sessionId);
      this.memoryStore.set(USER_SESSIONS_KEY(session.userId), userSessions);
    }

    // Store in PostgreSQL (persistent history) - if model exists
    try {
      // Check if scanSession model exists by trying to access it
      if ((this.prisma as any).scanSession) {
        await (this.prisma as any).scanSession.create({
          data: {
            id: sessionId,
            userId: session.userId,
            scopeType: session.scopeType,
            scopeData: session.scopeData,
            status: 'PENDING',
            startedAt: now,
            metadata: fullSession.metadata,
          },
        });
      }
    } catch (error) {
      console.error('SessionStorage: Failed to persist session to database:', error);
      // Continue with Redis/memory storage
    }

    return fullSession;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<ScanSession | null> {
    // Try Redis first
    if (this.getStorageClient() === 'redis') {
      const sessionData = await this.redisClient!.get(SESSION_KEY(sessionId));
      if (sessionData) {
        return JSON.parse(sessionData);
      }
    } else {
      // Try memory
      const sessionData = this.memoryStore.get(SESSION_KEY(sessionId));
      if (sessionData) {
        return sessionData;
      }
    }

    // Fallback to database
    try {
      // Check if scanSession model exists
      if ((this.prisma as any).scanSession) {
        const dbSession = await (this.prisma as any).scanSession.findUnique({
          where: { id: sessionId },
        });

        if (dbSession) {
          const session: ScanSession = {
            id: dbSession.id,
            userId: dbSession.userId,
            scopeType: dbSession.scopeType as any,
            scopeData: dbSession.scopeData as any,
            status: dbSession.status as any,
            startedAt: dbSession.startedAt,
            completedAt: dbSession.completedAt || undefined,
            results: [],
            metadata: dbSession.metadata as any,
          };

          // Cache in Redis/memory for future access
          if (this.getStorageClient() === 'redis') {
            await this.redisClient!.setex(
              SESSION_KEY(sessionId),
              SESSION_TTL,
              JSON.stringify(session)
            );
          } else {
            this.memoryStore.set(SESSION_KEY(sessionId), session);
          }

          return session;
        }
      }
    } catch (error) {
      console.error('SessionStorage: Failed to fetch session from database:', error);
    }

    return null;
  }

  /**
   * Update session status and progress
   */
  async updateSession(
    sessionId: string,
    updates: Partial<{
      status: ScanSession['status'];
      completedAt: Date;
      metadata: Partial<ScanSession['metadata']>;
      results: ScoredOpportunity[];
    }>
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    // Update session object
    if (updates.status) session.status = updates.status;
    if (updates.completedAt) session.completedAt = updates.completedAt;
    if (updates.metadata && session.metadata) {
      // Handle partial metadata updates
      const updatedMetadata = { ...session.metadata };
      if (updates.metadata.symbolsScanned !== undefined) updatedMetadata.symbolsScanned = updates.metadata.symbolsScanned;
      if (updates.metadata.durationMs !== undefined) updatedMetadata.durationMs = updates.metadata.durationMs;
      if (updates.metadata.signalsDetected !== undefined) updatedMetadata.signalsDetected = updates.metadata.signalsDetected;
      if (updates.metadata.apiCallsMade !== undefined) updatedMetadata.apiCallsMade = updates.metadata.apiCallsMade;
      if (updates.metadata.cacheHitRate !== undefined) updatedMetadata.cacheHitRate = updates.metadata.cacheHitRate;
      if (updates.metadata.errorCount !== undefined) updatedMetadata.errorCount = updates.metadata.errorCount;
      session.metadata = updatedMetadata;
    }
    if (updates.results) session.results = updates.results;

    // Update Redis/memory
    if (this.getStorageClient() === 'redis') {
      await this.redisClient!.setex(
        SESSION_KEY(sessionId),
        SESSION_TTL,
        JSON.stringify(session)
      );
      
      // Store results separately with longer TTL
      if (updates.results) {
        await this.redisClient!.setex(
          RESULT_KEY(sessionId),
          RESULT_TTL,
          JSON.stringify(updates.results)
        );
      }
    } else {
      this.memoryStore.set(SESSION_KEY(sessionId), session);
      if (updates.results) {
        this.memoryStore.set(RESULT_KEY(sessionId), updates.results);
      }
    }

    // Update database
    try {
      // Check if scanSession model exists
      if ((this.prisma as any).scanSession) {
        await (this.prisma as any).scanSession.update({
          where: { id: sessionId },
          data: {
            status: session.status,
            completedAt: session.completedAt,
            metadata: session.metadata,
          },
        });
      }
    } catch (error) {
      console.error('SessionStorage: Failed to update session in database:', error);
    }

    return true;
  }

  /**
   * Update progress for a session
   */
  async updateProgress(
    sessionId: string,
    progress: {
      completed: number;
      total: number;
      currentChunk?: string[];
      estimatedTimeRemaining?: number;
    }
  ): Promise<void> {
    const progressData: ScanProgressResponse = {
      sessionId,
      status: 'RUNNING',
      progress: {
        completed: progress.completed,
        total: progress.total,
        percentage: Math.round((progress.completed / progress.total) * 100),
      },
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      currentChunk: progress.currentChunk,
    };

    if (this.getStorageClient() === 'redis') {
      await this.redisClient!.setex(
        PROGRESS_KEY(sessionId),
        PROGRESS_TTL,
        JSON.stringify(progressData)
      );
    } else {
      this.memoryStore.set(PROGRESS_KEY(sessionId), progressData);
    }
  }

  /**
   * Get progress for a session
   */
  async getProgress(sessionId: string): Promise<ScanProgressResponse | null> {
    if (this.getStorageClient() === 'redis') {
      const progressData = await this.redisClient!.get(PROGRESS_KEY(sessionId));
      return progressData ? JSON.parse(progressData) : null;
    } else {
      return this.memoryStore.get(PROGRESS_KEY(sessionId)) || null;
    }
  }

  /**
   * Get session results
   */
  async getResults(sessionId: string): Promise<ScoredOpportunity[] | null> {
    // Try Redis/memory cache first
    if (this.getStorageClient() === 'redis') {
      const resultData = await this.redisClient!.get(RESULT_KEY(sessionId));
      if (resultData) {
        return JSON.parse(resultData);
      }
    } else {
      const resultData = this.memoryStore.get(RESULT_KEY(sessionId));
      if (resultData) {
        return resultData;
      }
    }

    // Fallback to session data
    const session = await this.getSession(sessionId);
    return session?.results || null;
  }

  /**
   * Get user's recent sessions
   */
  async getUserSessions(userId: string, limit: number = 10): Promise<ScanSession[]> {
    const sessions: ScanSession[] = [];

    // Try Redis/memory first
    if (this.getStorageClient() === 'redis') {
      const sessionIds = await this.redisClient!.smembers(USER_SESSIONS_KEY(userId));
      
      // Get session data for each ID
      for (const sessionId of sessionIds.slice(0, limit)) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
    } else {
      const sessionIds = this.memoryStore.get(USER_SESSIONS_KEY(userId)) || [];
      for (const sessionId of sessionIds.slice(0, limit)) {
        const session = this.memoryStore.get(SESSION_KEY(sessionId));
        if (session) {
          sessions.push(session);
        }
      }
    }

    // If not enough sessions in cache, query database
    if (sessions.length < limit) {
      try {
        // Check if scanSession model exists
        if ((this.prisma as any).scanSession) {
          const dbSessions = await (this.prisma as any).scanSession.findMany({
            where: { userId },
            orderBy: { startedAt: 'desc' },
            take: limit,
          });

          for (const dbSession of dbSessions) {
            const session: ScanSession = {
              id: dbSession.id,
              userId: dbSession.userId,
              scopeType: dbSession.scopeType as any,
              scopeData: dbSession.scopeData as any,
              status: dbSession.status as any,
              startedAt: dbSession.startedAt,
              completedAt: dbSession.completedAt || undefined,
              results: [],
              metadata: dbSession.metadata as any,
            };

            // Add to sessions list if not already present
            if (!sessions.find(s => s.id === session.id)) {
              sessions.push(session);
            }

            // Cache in Redis/memory
            if (this.getStorageClient() === 'redis') {
              await this.redisClient!.setex(
                SESSION_KEY(session.id),
                SESSION_TTL,
                JSON.stringify(session)
              );
              await this.redisClient!.sadd(USER_SESSIONS_KEY(userId), session.id);
            } else {
              this.memoryStore.set(SESSION_KEY(session.id), session);
              const userSessions = this.memoryStore.get(USER_SESSIONS_KEY(userId)) || [];
              if (!userSessions.includes(session.id)) {
                userSessions.push(session.id);
                this.memoryStore.set(USER_SESSIONS_KEY(userId), userSessions);
              }
            }
          }
        }
      } catch (error) {
        console.error('SessionStorage: Failed to fetch user sessions from database:', error);
      }
    }

    // Sort by startedAt (newest first)
    return sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, limit);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;

    if (this.getStorageClient() === 'redis') {
      // Redis handles TTL automatically, but we can clean up user session sets
      // This is a simplified implementation
      console.log('SessionStorage: Redis TTL handles expiration automatically');
    } else {
      // Clean up memory store
      const now = Date.now();
      const oneHourAgo = now - (SESSION_TTL * 1000);
      
      for (const [key, value] of this.memoryStore.entries()) {
        if (key.startsWith('scanner:session:')) {
          const session = value as ScanSession;
          if (session.startedAt.getTime() < oneHourAgo) {
            this.memoryStore.delete(key);
            cleanedCount++;
          }
        }
      }
    }

    return cleanedCount;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    redisConnected: boolean;
    memoryStoreSize: number;
    activeSessions: number;
  }> {
    let activeSessions = 0;

    if (this.getStorageClient() === 'redis') {
      // Count session keys
      const keys = await this.redisClient!.keys('scanner:session:*');
      activeSessions = keys.length;
    } else {
      // Count memory store sessions
      for (const key of this.memoryStore.keys()) {
        if (key.startsWith('scanner:session:')) {
          activeSessions++;
        }
      }
    }

    return {
      redisConnected: this.isRedisConnected,
      memoryStoreSize: this.memoryStore.size,
      activeSessions,
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.isRedisConnected = false;
    }
    this.memoryStore.clear();
  }
}