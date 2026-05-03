import os
import sys

output = os.environ.get("SCRIPT_OUTPUT", "NOT_SET")
print(f"Received from previous script: {output}")
sys.exit(0)
