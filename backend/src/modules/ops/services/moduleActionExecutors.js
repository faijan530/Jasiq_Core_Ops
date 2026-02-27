import { badRequest } from '../../../shared/kernel/errors.js';

const REGISTRY = new Map();

export function registerExecutor(overrideType, fn) {
  if (!overrideType || typeof fn !== 'function') throw badRequest('Invalid executor registration');
  REGISTRY.set(String(overrideType).toUpperCase(), fn);
}

export function getExecutor(overrideType) {
  const key = String(overrideType || '').toUpperCase();
  return REGISTRY.get(key) || null;
}

export function listRegisteredExecutors() {
  return Array.from(REGISTRY.keys()).sort();
}
