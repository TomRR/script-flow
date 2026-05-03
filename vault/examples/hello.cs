using System;

Console.WriteLine($"SECRET_VAR = {Environment.GetEnvironmentVariable("SECRET_VAR")}");
Console.WriteLine($"ENV_VAR = {Environment.GetEnvironmentVariable("ENV_VAR")}");
Console.WriteLine($"INPUT_VAR = {Environment.GetEnvironmentVariable("INPUT_VAR")}");
await Task.Delay(3000);
Console.WriteLine("Hello fromg C#");
