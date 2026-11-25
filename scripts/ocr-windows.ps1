# ocr-windows.ps1 — OCR de páginas escaneadas usando o motor do Windows (Windows.Media.Ocr).
# uso: powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/ocr-windows.ps1 -ListFile paginas.txt -OutDir saida
# o arquivo de lista tem um caminho de imagem por linha; cada imagem vira <nome>.json com as linhas e a posição delas.

param(
  [Parameter(Mandatory = $true)][string]$ListFile,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [string]$Lang = 'pt-BR'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]

function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new($Lang))
if (-not $engine) {
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}
if (-not $engine) {
  Write-Error "nenhum motor de OCR disponível para $Lang"
  exit 2
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)

$files = Get-Content -LiteralPath $ListFile -Encoding UTF8 | Where-Object { $_ -and $_.Trim().Length -gt 0 }
$total = @($files).Count
$index = 0

foreach ($file in $files) {
  $index++
  $file = $file.Trim()
  if (-not (Test-Path -LiteralPath $file)) {
    Write-Warning "faltou: $file"
    continue
  }
  try {
    $storage = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path -LiteralPath $file).Path)) ([Windows.Storage.StorageFile])
    $stream = Await ($storage.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

    $lines = @()
    foreach ($line in $result.Lines) {
      $text = $line.Text
      if (-not $text -or $text.Trim().Length -eq 0) { continue }
      $x1 = [double]::MaxValue; $y1 = [double]::MaxValue; $x2 = 0.0; $y2 = 0.0
      foreach ($word in $line.Words) {
        $rect = $word.BoundingRect
        if ($rect.X -lt $x1) { $x1 = $rect.X }
        if ($rect.Y -lt $y1) { $y1 = $rect.Y }
        if (($rect.X + $rect.Width) -gt $x2) { $x2 = $rect.X + $rect.Width }
        if (($rect.Y + $rect.Height) -gt $y2) { $y2 = $rect.Y + $rect.Height }
      }
      if ($x1 -eq [double]::MaxValue) { $x1 = 0; $y1 = 0 }
      $lines += [pscustomobject]@{
        text = $text
        x    = [math]::Round($x1, 1)
        y    = [math]::Round($y1, 1)
        w    = [math]::Round($x2 - $x1, 1)
        h    = [math]::Round($y2 - $y1, 1)
      }
    }

    $payload = [pscustomobject]@{
      width  = $bitmap.PixelWidth
      height = $bitmap.PixelHeight
      lines  = $lines
    }
    $target = Join-Path $OutDir ([System.IO.Path]::GetFileNameWithoutExtension($file) + '.json')
    [System.IO.File]::WriteAllText($target, ($payload | ConvertTo-Json -Depth 5 -Compress), $utf8)
    $stream.Dispose()
    $bitmap.Dispose()
    Write-Output ("[{0}/{1}] {2} ({3} linhas)" -f $index, $total, (Split-Path -Leaf $file), $lines.Count)
  }
  catch {
    Write-Warning ("falhou {0}: {1}" -f (Split-Path -Leaf $file), $_.Exception.Message)
  }
}
