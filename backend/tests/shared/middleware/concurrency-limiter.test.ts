/// <reference types="@types/jest" />
/**
 * Unit tests for createInFlightLimiter (src/shared/middleware/concurrency-limiter.ts).
 *
 * The limiter no-ops when NODE_ENV === 'test', so each test temporarily sets
 * NODE_ENV = 'development' to exercise the real cap logic, then restores the
 * original value in afterEach.
 *
 * Fake req/res objects are lightweight EventEmitter-backed stubs — no HTTP stack
 * needed.  Style mirrors the sibling shared/utils tests in this directory.
 */
import { EventEmitter } from 'events';
import { createInFlightLimiter } from '../../../src/shared/middleware/concurrency-limiter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq() {
  return {} as any;
}

function makeRes() {
  const emitter = new EventEmitter();
  const res = Object.assign(emitter, {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  });
  return res as typeof res & { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock };
}

let savedNodeEnv: string | undefined;

beforeEach(() => {
  savedNodeEnv = process.env.NODE_ENV;
  // Activate real cap logic — limiter is disabled under NODE_ENV==='test'.
  process.env.NODE_ENV = 'development';
});

afterEach(() => {
  process.env.NODE_ENV = savedNodeEnv;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createInFlightLimiter', () => {
  it('calls next() for the first request (under cap)', () => {
    const limiter = createInFlightLimiter({ name: 'test-limiter', maxInFlight: 2 });
    const next = jest.fn();
    const res = makeRes();

    limiter(makeReq(), res as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for requests up to maxInFlight', () => {
    const limiter = createInFlightLimiter({ name: 'test-limiter', maxInFlight: 3 });
    const nexts = [jest.fn(), jest.fn(), jest.fn()];
    const ress = [makeRes(), makeRes(), makeRes()];

    nexts.forEach((next, i) => limiter(makeReq(), ress[i] as any, next));

    nexts.forEach((next) => expect(next).toHaveBeenCalledTimes(1));
    ress.forEach((res) => expect(res.status).not.toHaveBeenCalled());
  });

  it('responds 503 with Retry-After and documented JSON body on the (cap+1)th request', () => {
    const limiter = createInFlightLimiter({ name: 'busy-limiter', maxInFlight: 2 });
    const ress = [makeRes(), makeRes(), makeRes()];

    // Saturate the cap — don't finish the first two.
    limiter(makeReq(), ress[0] as any, jest.fn());
    limiter(makeReq(), ress[1] as any, jest.fn());

    // Third request must be shed.
    const overNext = jest.fn();
    limiter(makeReq(), ress[2] as any, overNext);

    expect(overNext).not.toHaveBeenCalled();
    expect(ress[2].setHeader).toHaveBeenCalledWith('Retry-After', '1');
    expect(ress[2].status).toHaveBeenCalledWith(503);
    expect(ress[2].json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String),
      limiter: 'busy-limiter',
    }));
  });

  it('frees a slot when a response emits "finish", allowing the next request through', () => {
    const limiter = createInFlightLimiter({ name: 'finish-limiter', maxInFlight: 1 });
    const res1 = makeRes();
    const next1 = jest.fn();

    // Saturate with one request.
    limiter(makeReq(), res1 as any, next1);
    expect(next1).toHaveBeenCalledTimes(1);

    // Overflow while saturated.
    const res2 = makeRes();
    const next2 = jest.fn();
    limiter(makeReq(), res2 as any, next2);
    expect(next2).not.toHaveBeenCalled();

    // Finish the first request → slot released.
    res1.emit('finish');

    // Now a new request should pass.
    const res3 = makeRes();
    const next3 = jest.fn();
    limiter(makeReq(), res3 as any, next3);
    expect(next3).toHaveBeenCalledTimes(1);
  });

  it('frees a slot when a response emits "close"', () => {
    const limiter = createInFlightLimiter({ name: 'close-limiter', maxInFlight: 1 });
    const res1 = makeRes();

    limiter(makeReq(), res1 as any, jest.fn());

    // Overflow
    const res2 = makeRes();
    const overflow = jest.fn();
    limiter(makeReq(), res2 as any, overflow);
    expect(overflow).not.toHaveBeenCalled();

    // Release via 'close'.
    res1.emit('close');

    const res3 = makeRes();
    const next3 = jest.fn();
    limiter(makeReq(), res3 as any, next3);
    expect(next3).toHaveBeenCalledTimes(1);
  });

  it('decrements only once when both "finish" and "close" fire on the same response', () => {
    // If both events fired without a guard, inFlight would drop below zero and the
    // subsequent request would immediately see a free slot even when cap=1.
    // With the `released` guard it stays accurate.
    const limiter = createInFlightLimiter({ name: 'double-release-limiter', maxInFlight: 1 });
    const res1 = makeRes();
    limiter(makeReq(), res1 as any, jest.fn());

    // Fire both events.
    res1.emit('finish');
    res1.emit('close');

    // A new request should consume the single freed slot.
    const res2 = makeRes();
    const next2 = jest.fn();
    limiter(makeReq(), res2 as any, next2);
    expect(next2).toHaveBeenCalledTimes(1);

    // One more request — should now be over cap (res2 still in-flight).
    const res3 = makeRes();
    const over = jest.fn();
    limiter(makeReq(), res3 as any, over);
    expect(over).not.toHaveBeenCalled();
    expect(res3.status).toHaveBeenCalledWith(503);
  });
});
