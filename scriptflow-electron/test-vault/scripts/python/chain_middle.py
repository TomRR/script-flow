import os

output = os.environ.get("SCRIPT_OUTPUT", "NOT_SET")
print(f"Middle script received: {output}")
print("CHAIN_STEP_2_DONE")
