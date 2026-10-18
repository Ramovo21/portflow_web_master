const KEY = "pf.inbox.queue";

export interface QueueItem {
  documentType: string;
  documentId: string;
}

export function saveQueue(items: QueueItem[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    return;
  }
}

export function readQueue(): QueueItem[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
  } catch {
    return [];
  }
}

export function nextInQueue(current: QueueItem): QueueItem | undefined {
  const queue = readQueue();
  const index = queue.findIndex(
    (item) => item.documentType === current.documentType && item.documentId === current.documentId,
  );
  const rest = index >= 0 ? queue.slice(index + 1) : queue;
  return rest.find(
    (item) =>
      !(item.documentType === current.documentType && item.documentId === current.documentId),
  );
}

export function removeFromQueue(current: QueueItem) {
  saveQueue(
    readQueue().filter(
      (item) =>
        !(item.documentType === current.documentType && item.documentId === current.documentId),
    ),
  );
}
