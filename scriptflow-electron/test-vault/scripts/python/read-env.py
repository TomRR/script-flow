import os
import sys

my_var = os.environ.get("MY_VAR", "NOT_SET")
print(f"MY_VAR is: {my_var}")
sys.exit(0)
