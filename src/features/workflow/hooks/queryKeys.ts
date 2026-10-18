export const workflowKeys = {
  all: ["workflow"] as const,
  ofDocument: (documentType: string, documentId: string) =>
    ["workflow", documentType, documentId] as const,
  instance: (id: string) => ["workflow", "instance", id] as const,
  inbox: ["inbox"] as const,
  inboxList: (params: object) => ["inbox", params] as const,
  counters: ["inbox-counters"] as const,
};
