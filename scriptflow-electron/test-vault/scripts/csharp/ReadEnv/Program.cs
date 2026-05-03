var myVar = Environment.GetEnvironmentVariable("MY_VAR") ?? "NOT_SET";
Console.WriteLine($"MY_VAR is: {myVar}");
return 0;
