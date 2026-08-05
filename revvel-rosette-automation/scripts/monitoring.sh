#!/usr/bin/env bash
# Monitoring script - Check system health and metrics

set -euo pipefail

echo "🔍 Revvel Rosette Monitoring"
echo "============================"
echo ""

# Check if processes are running
echo "Process Status:"
if pgrep -f "src/scheduler.py" > /dev/null; then
    echo "  ✓ Scheduler is running"
else
    echo "  ✗ Scheduler is NOT running"
fi

if pgrep -f "src/selfheal.py" > /dev/null; then
    echo "  ✓ Self-Healer is running"
else
    echo "  ✗ Self-Healer is NOT running"
fi

echo ""

# Check queue status
echo "Queue Status:"
if [ -f "queue.txt" ]; then
    QUEUE_SIZE=$(wc -l < queue.txt)
    echo "  Queue size: $QUEUE_SIZE items"
    
    if [ "$QUEUE_SIZE" -gt 100 ]; then
        echo "  ⚠️  Queue is large (>100 items)"
    fi
else
    echo "  ⚠️  queue.txt not found"
fi

echo ""

# Check log files
echo "Recent Errors:"
if [ -d "logs" ]; then
    ERROR_COUNT=$(grep -r "ERROR" logs/ 2>/dev/null | wc -l || echo "0")
    echo "  Error count (last 24h): $ERROR_COUNT"
    
    if [ "$ERROR_COUNT" -gt 10 ]; then
        echo "  ⚠️  High error rate detected"
    fi
else
    echo "  No logs directory"
fi

echo ""

# Check disk space
echo "Disk Space:"
df -h . | tail -1 | awk '{print "  Used: " $3 " / " $2 " (" $5 ")"}'

echo ""

# Check last successful run
echo "Last Automation Run:"
if [ -f "logs/last-run.txt" ]; then
    cat logs/last-run.txt
else
    echo "  No run history available"
fi

echo ""
echo "✅ Monitoring check complete"
