var output = Environment.GetEnvironmentVariable("SCRIPT_OUTPUT") ?? "NOT_SET";
Console.WriteLine($"Middle script received: {output}");
Console.WriteLine("CHAIN_STEP_2_DONE");
