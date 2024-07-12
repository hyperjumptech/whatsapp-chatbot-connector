export default class InMemoryDatabase<T> {
  private storage: { [key: string]: T };

  constructor() {
    this.storage = {};
  }

  get(key: string) {
    return this.storage[key] || null;
  }

  set(key: string, value: T) {
    this.storage[key] = value;
  }
}
