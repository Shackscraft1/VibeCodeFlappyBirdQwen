/**
 * Tiny pub/sub bus that decouples the simulation core from rendering,
 * sound, and UI. The Game core only knows about events.
 */
export class EventBus {
  #handlers = new Map();

  /** Subscribe; returns a function that removes the handler. */
  on(event, handler) {
    if (!this.#handlers.has(event)) this.#handlers.set(event, new Set());
    this.#handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.#handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    const handlers = this.#handlers.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) handler(payload);
  }
}
