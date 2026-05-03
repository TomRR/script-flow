var output = Environment.GetEnvironmentVariable("SCRIPT_OUTPUT") ?? "NOT_SET";
Console.WriteLine($"Received from previous script: {output}");
return 0;
