export type LaunchTaskInput = {
  taskId: string;
  workspacePath: string;
};

export function launchTaskProcess(input: LaunchTaskInput): void {
  console.log(`launch task ${input.taskId} in ${input.workspacePath}`);
}
