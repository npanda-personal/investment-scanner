/**
 * Smoke test: calls getEventFeed() against the live DB and prints results.
 * Run: npx ts-node scripts/smoke-event-feed.ts
 */
import { getEventFeed } from '../src/modules/market-intelligence/event-feed.service';
import { runScript } from './_run-script';

async function main() {
  console.log('=== Market Events Smoke Test ===\n');

  const result = await getEventFeed(5);

  console.log(`Availability: ${result.availability}`);
  console.log(`Total events: ${result.eventCount}`);
  console.log(`As of: ${result.asOf}`);
  console.log(`Message: ${result.message}`);
  if (result.warnings.length > 0) {
    console.log(`Warnings: ${result.warnings.join('; ')}`);
  }
  console.log('\n--- Sample events (first 12) ---');

  const sample = result.events.slice(0, 12);
  for (const ev of sample) {
    console.log(`[${ev.date}] [${ev.type}] [${ev.tone.toUpperCase()}] ${ev.description}`);
    if (ev.symbols.length > 0) {
      console.log(`   Symbols: ${ev.symbols.join(', ')}`);
    }
  }

  // Type breakdown
  const byType: Record<string, number> = {};
  for (const ev of result.events) {
    byType[ev.type] = (byType[ev.type] ?? 0) + 1;
  }
  console.log('\n--- Event type breakdown ---');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }
}

runScript(main);
