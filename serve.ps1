param(
    [int]$Port = 8000,
    [string]$Root = (Get-Location)
)

$Root = (Resolve-Path $Root).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "Serving '$Root' at http://localhost:$Port/" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop.`n"

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".txt"  = "text/plain; charset=utf-8"
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $resp = $ctx.Response

        $rawUrl = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart("/"))
        if ([string]::IsNullOrEmpty($rawUrl)) { $rawUrl = "index.html" }

        $filePath = Join-Path $Root $rawUrl
        $filePath = [IO.Path]::GetFullPath($filePath)

        # Prevent path traversal
        if (-not $filePath.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
            $resp.StatusCode = 403
            $resp.Close()
            continue
        }

        $status = "200"
        if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
            $filePath = Join-Path $Root "index.html"
            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $resp.StatusCode = 404
                $bytes = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $resp.OutputStream.Write($bytes, 0, $bytes.Length)
                $resp.Close()
                continue
            }
            $status = "200 (fallback index.html)"
        }

        $ext = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
        $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
        $resp.ContentType = $contentType
        $resp.Headers.Add("Cache-Control", "no-cache")

        $bytes = [IO.File]::ReadAllBytes($filePath)
        $resp.ContentLength64 = $bytes.Length
        $resp.OutputStream.Write($bytes, 0, $bytes.Length)
        $resp.Close()

        Write-Host "[$status] $($req.HttpMethod) $($req.Url.AbsolutePath) -> $contentType" -ForegroundColor Cyan
    }
}
finally {
    $listener.Stop()
    Write-Host "`nServer stopped." -ForegroundColor Yellow
}
