/** In-memory stand-in for expo-secure-store in Jest. */
const store = new Map<string, string>();

export const secureStoreMock = {
  getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    store.delete(key);
  }),
  reset() {
    store.clear();
    this.getItemAsync.mockClear();
    this.setItemAsync.mockClear();
    this.deleteItemAsync.mockClear();
  },
};
