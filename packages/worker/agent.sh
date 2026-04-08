#!/bin/bash
# packages/worker/agent.sh

echo "[Worker] Starting work on $TASK_ID..."

# --- THE HEARTBEAT (Every 15s) ---
# We run this in the background to tell the orchestrator we are alive
(
  while true; do
    sleep 15
    # Update the lastHeartbeat timestamp in the DB
    # Note: Requires sqlite3 CLI installed on your machine
    sqlite3 "$DB_PATH" "UPDATE tasks SET lastHeartbeat = $(date +%s%3N) WHERE id = '$TASK_ID';"
  done
) &
HEARTBEAT_PID=$!

# --- THE ACTUAL WORK ---
# This is where your git logic goes
# For now, we simulate work
sleep 20

# --- CLEANUP & EXIT ---
kill $HEARTBEAT_PID # Stop the heartbeat before exiting
echo "[Worker] Work complete for $TASK_ID."
exit 0 # Success