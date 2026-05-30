# Windows OCR using built-in Windows.Media.Ocr (Windows 10/11)
# Usage: powershell -ExecutionPolicy Bypass -File windows_ocr.ps1 "path\to\image.jpg"
param([string]$ImagePath)

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime

    # Helper to await WinRT async operations
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    })[0]

    Function Await($WinRtTask, $ResultType) {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(-1) | Out-Null
        $netTask.Result
    }

    # Load required WinRT types
    $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]

    # Resolve full path
    $fullPath = (Resolve-Path $ImagePath).Path

    # Open file
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPath)) ([Windows.Storage.StorageFile])
    
    # Open stream
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    
    # Decode bitmap
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    
    # Create OCR engine (uses system languages)
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    
    if ($null -eq $engine) {
        # Fallback to English
        $lang = [Windows.Globalization.Language]::new("en")
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
    }

    if ($null -eq $engine) {
        Write-Error "OCR engine not available"
        exit 1
    }

    # Perform OCR
    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    
    # Output text line by line (preserving structure)
    foreach ($line in $result.Lines) {
        Write-Output $line.Text
    }

    # Cleanup
    $stream.Dispose()
}
catch {
    Write-Error "OCR failed: $_"
    exit 1
}
