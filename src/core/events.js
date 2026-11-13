// Minimal pub/sub event bus.
const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
  return fn;
}

export function off(event, fn) {
  const arr = listeners.get(event);
  if (arr) {
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
}

export function emit(event, data) {
  const arr = listeners.get(event);
  if (arr) for (const fn of [...arr]) fn(data);
}
