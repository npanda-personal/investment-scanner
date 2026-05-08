export const signal_generation_engine_batch_size = 100;
export const signal_generation_engine_workers_count = 4;
export const signal_generation_engine_max_workers_count = 6;
export const signal_generation_engine_provider_throttle_ms = process.env.NODE_ENV === 'test' ? 0 : 250;

