param([int]$Port = 8000, [string]$Root = (Get-Location))
$Root = (Resolve-Path $Root).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving '$Root' at http://localhost:$Port/" -ForegroundColor Green
$mime = @{".html"="text/html; charset=utf-8";".css"="text/css; charset=utf-8";".js"="application/javascript; charset=utf-8";".png"="image/png";".jpg"="image/jpeg";".svg"="image/svg+xml";".ico"="image/x-icon";".json"="application/json; charset=utf-8"}
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $rawUrl = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrEmpty($rawUrl)) { $rawUrl = "index.html" }
    $filePath = Join-Path $Root $rawUrl
    $filePath = [IO.Path]::GetFullPath($filePath)
    if (-not $filePath.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) { $ctx.Response.StatusCode = 403; $ctx.Response.Close(); continue }
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
      $filePath = Join-Path $Root "index.html"
      if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) { $ctx.Response.StatusCode = 404; $ctx.Response.Close(); continue }
    }
    $ext = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
    $ctx.Response.ContentType = $contentType
    $ctx.Response.Headers.Add("Cache-Control", "no-cache")
    $bytes = [IO.File]::ReadAllBytes($filePath)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
  }
} finally { $listener.Stop() }
