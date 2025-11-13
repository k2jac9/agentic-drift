/**
 * CircularBuffer - Fixed-size buffer with automatic overflow handling
 *
 * Prevents memory leaks by maintaining a maximum size
 * Older entries are automatically overwritten when buffer is full
 */

export class CircularBuffer {
  /**
   * @param {number} maxSize - Maximum number of items to store
   */
  constructor(maxSize = 1000) {
    this.buffer = new Array(maxSize);
    this.maxSize = maxSize;
    this.index = 0;
    this.size = 0;
  }

  /**
   * Add item to buffer
   * Overwrites oldest item if buffer is full
   *
   * @param {*} item - Item to add
   */
  push(item) {
    this.buffer[this.index] = item;
    this.index = (this.index + 1) % this.maxSize;
    this.size = Math.min(this.size + 1, this.maxSize);
  }

  /**
   * Get all items in buffer (in insertion order)
   *
   * @returns {Array} All items
   */
  getAll() {
    if (this.size < this.maxSize) {
      return this.buffer.slice(0, this.size);
    }

    // Buffer is full, need to reconstruct order
    const start = this.index;
    return [...this.buffer.slice(start), ...this.buffer.slice(0, start)];
  }

  /**
   * Get most recent N items
   *
   * @param {number} count - Number of items to retrieve
   * @returns {Array} Recent items
   */
  getRecent(count) {
    const all = this.getAll();
    return all.slice(-count);
  }

  /**
   * Get oldest N items
   *
   * @param {number} count - Number of items to retrieve
   * @returns {Array} Oldest items
   */
  getOldest(count) {
    const all = this.getAll();
    return all.slice(0, count);
  }

  /**
   * Clear all items
   */
  clear() {
    this.buffer = new Array(this.maxSize);
    this.index = 0;
    this.size = 0;
  }

  /**
   * Check if buffer is full
   *
   * @returns {boolean} True if full
   */
  isFull() {
    return this.size === this.maxSize;
  }

  /**
   * Check if buffer is empty
   *
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.size === 0;
  }

  /**
   * Get current size
   *
   * @returns {number} Number of items in buffer
   */
  length() {
    return this.size;
  }

  /**
   * Get item at index (0 = oldest, size-1 = newest)
   *
   * @param {number} idx - Index
   * @returns {*} Item at index
   */
  at(idx) {
    if (idx < 0 || idx >= this.size) {
      return undefined;
    }

    const all = this.getAll();
    return all[idx];
  }

  /**
   * Filter items
   *
   * @param {Function} predicate - Filter function
   * @returns {Array} Filtered items
   */
  filter(predicate) {
    return this.getAll().filter(predicate);
  }

  /**
   * Map items
   *
   * @param {Function} mapper - Map function
   * @returns {Array} Mapped items
   */
  map(mapper) {
    return this.getAll().map(mapper);
  }

  /**
   * Get statistics about buffer usage
   *
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      utilization: (this.size / this.maxSize) * 100,
      isFull: this.isFull(),
      isEmpty: this.isEmpty()
    };
  }
}
