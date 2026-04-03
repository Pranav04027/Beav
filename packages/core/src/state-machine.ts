import { type TaskStatus } from "./types.js";

/*
Why Class: Class have Memory, Encapsulation (Black Box), Multiple tasks(multiple instances)
*/
export class TaskStateMachine{
    private currentStatus:  TaskStatus;
    
    constructor(initialStatus: TaskStatus = "pending") {
        this.currentStatus = initialStatus;
    }
    
    // Allowed Moves map
    private transitions: Record<TaskStatus, TaskStatus[]> = {
        pending: ["claimed"],
        claimed: ["running", "crashed"],
        running: ["verifying", "failed", "crashed"],
        verifying: ["done", "failed"],
        done: [], // Terminal state
        failed: ["pending"], // Can be retried
        crashed: ["pending"], // Can be retried
    };
    
    // action 
    transitionTo(next: TaskStatus) {
        const allowed = this.transitions[this.currentStatus];
    
        if (!allowed.includes(next)) {
          throw new Error(
            `Invalid Transition: Cannot move from ${this.currentStatus} to ${next}`
          );
        }
    
        this.currentStatus = next;
        return this.currentStatus;
    }
    
    // Helper to get Current Status
    getStatus() {
        return this.currentStatus;
      }
    
    
    
}