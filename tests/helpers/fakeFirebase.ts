/* Firebase simulado en memoria para pruebas. Sustituye a "@/lib/firebase". */
type Data = Record<string, unknown>;

export const store = new Map<string, Data>();

const TOKENS: Record<string, { uid: string; email: string; rol?: string }> = {
  "token-a": { uid: "uid-a", email: "a@test.com" },
  "token-b": { uid: "uid-b", email: "b@test.com" },
  "token-admin": { uid: "uid-admin", email: "admin@test.com", rol: "admin" },
};

export const adminAuth = () => ({
  verifyIdToken: async (token: string) => {
    const user = TOKENS[token];
    if (!user) throw new Error("token inválido");
    return user;
  },
});

export const webApiKey = () => "clave-de-prueba";

type Filter = { field: string; value: unknown };

function docRef(path: string) {
  return {
    path,
    id: path.split("/").pop() as string,
    collection: (name: string) => colRef(`${path}/${name}`),
    get: async () => snapshot(path),
  };
}

function snapshot(path: string) {
  const data = store.get(path);
  return { exists: data !== undefined, id: path.split("/").pop() as string, data: () => data };
}

function colRef(path: string, filters: Filter[] = [], max = Infinity) {
  const self = {
    doc: (id: string) => docRef(`${path}/${id}`),
    orderBy: () => self,
    where: (field: string, _op: string, value: unknown) => colRef(path, [...filters, { field, value }], max),
    limit: (n: number) => colRef(path, filters, n),
    get: async () => {
      const prefix = `${path}/`;
      const docs = [...store.entries()]
        .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
        .filter(([, d]) => filters.every((f) => String(d[f.field]) > String(f.value)))
        .slice(0, max)
        .map(([key]) => snapshot(key));
      return { docs };
    },
  };
  return self;
}

export const db = () => ({
  collection: (name: string) => colRef(name),
  runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
    fn({
      get: async (ref: { path: string }) => snapshot(ref.path),
      set: (ref: { path: string }, data: Data) => void store.set(ref.path, data),
      update: (ref: { path: string }, data: Data) => void store.set(ref.path, { ...store.get(ref.path), ...data }),
    }),
});
