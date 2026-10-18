export interface WorkflowProgress {
  instanceId: string;
  status: string;
  round: number;
  currentStepOrder: number | null;
  currentStepName: string | null;
  currentAssignees: string[];
  totalSteps: number;
  doneSteps: number;
}
