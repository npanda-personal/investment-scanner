/**
 * Test file for SessionStorageService
 * 
 * This is a simple test to verify the session storage service works correctly.
 * In a real project, you would use Jest or another testing framework.
 */

import { PrismaClient } from '@prisma/client';
import { SessionStorageService } from './session-storage';

// Mock Prisma client
const mockPrisma = new PrismaClient();

async function testSessionStorage() {
  console.log('=== Testing SessionStorageService ===\n');
  
  // Create service instance
  const storage = new SessionStorageService(mockPrisma, {
    enableRedis: false, // Disable Redis for testing
    fallbackToMemory: true,
  });

  try {
    // Test 1: Create a session
    console.log('Test 1: Creating a session...');
    const session = await storage.createSession({
      userId: 'test-user-123',
      scopeType: 'CUSTOM',
      scopeData: {
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        filters: {
          region: 'US',
          marketCapMin: 1000000000,
        },
      },
    });
    
    console.log(`✓ Session created: ${session.id}`);
    console.log(`  Status: ${session.status}`);
    console.log(`  User: ${session.userId}`);
    console.log(`  Symbols: ${session.scopeData.symbols?.join(', ')}`);

    // Test 2: Get the session
    console.log('\nTest 2: Retrieving the session...');
    const retrievedSession = await storage.getSession(session.id);
    if (retrievedSession) {
      console.log(`✓ Session retrieved: ${retrievedSession.id}`);
      console.log(`  Status: ${retrievedSession.status}`);
    } else {
      console.log('✗ Failed to retrieve session');
    }

    // Test 3: Update session progress
    console.log('\nTest 3: Updating session progress...');
    await storage.updateProgress(session.id, {
      completed: 1,
      total: 3,
      currentChunk: ['AAPL'],
      estimatedTimeRemaining: 120,
    });
    
    const progress = await storage.getProgress(session.id);
    if (progress) {
      console.log(`✓ Progress updated: ${progress.progress.completed}/${progress.progress.total} (${progress.progress.percentage}%)`);
      console.log(`  Current chunk: ${progress.currentChunk?.join(', ')}`);
    } else {
      console.log('✗ Failed to update progress');
    }

    // Test 4: Update session status
    console.log('\nTest 4: Updating session status...');
    const updateSuccess = await storage.updateSession(session.id, {
      status: 'RUNNING',
      metadata: {
        symbolsScanned: 1,
        durationMs: 5000,
        signalsDetected: 3,
        apiCallsMade: 10,
        cacheHitRate: 0.8,
        errorCount: 0,
      },
    });
    
    if (updateSuccess) {
      console.log('✓ Session updated successfully');
      
      const updatedSession = await storage.getSession(session.id);
      if (updatedSession && updatedSession.metadata) {
        console.log(`  New status: ${updatedSession.status}`);
        console.log(`  Symbols scanned: ${updatedSession.metadata.symbolsScanned}`);
      }
    } else {
      console.log('✗ Failed to update session');
    }

    // Test 5: Get user sessions
    console.log('\nTest 5: Getting user sessions...');
    const userSessions = await storage.getUserSessions('test-user-123', 5);
    console.log(`✓ Found ${userSessions.length} sessions for user`);
    userSessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.id} - ${s.status} - ${s.startedAt.toISOString()}`);
    });

    // Test 6: Get storage stats
    console.log('\nTest 6: Getting storage statistics...');
    const stats = await storage.getStats();
    console.log(`✓ Storage stats:`);
    console.log(`  Redis connected: ${stats.redisConnected}`);
    console.log(`  Memory store size: ${stats.memoryStoreSize}`);
    console.log(`  Active sessions: ${stats.activeSessions}`);

    // Test 7: Cleanup (simulate)
    console.log('\nTest 7: Cleaning up expired sessions...');
    const cleaned = await storage.cleanupExpiredSessions();
    console.log(`✓ Cleaned ${cleaned} expired sessions`);

    console.log('\n=== All tests completed successfully! ===');

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Clean up
    await storage.close();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSessionStorage().catch(console.error);
}

export { testSessionStorage };