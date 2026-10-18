# Construye el APK de Android de Tebille con Bubblewrap.
#
# Uso (en PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts\construir-apk.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\construir-apk.ps1 -Proyecto D:\otra\carpeta
#
# -Proyecto es la carpeta del proyecto de Bubblewrap (la que tiene twa-manifest.json y la llave).
# Debe estar en una ruta SIN espacios. Bubblewrap pedirá las 2 contraseñas de la llave.
param(
  [string]$Proyecto = 'C:\Users\USUARIO\tebille-twa'
)

if (-not (Test-Path (Join-Path $Proyecto 'twa-manifest.json'))) {
  Write-Error "No encontré twa-manifest.json en $Proyecto. Crea el proyecto con: bubblewrap init --manifest https://tebille.pages.dev/manifest.webmanifest"
  exit 1
}
Set-Location $Proyecto

# Arregla el error "gradlew.bat no se reconoce como un comando": algunos Windows tienen
# NoDefaultCurrentDirectoryInExePath=1 y no ejecutan programas de la carpeta actual.
# Solo se cambia para esta ejecución, no en el sistema.
Remove-Item Env:NoDefaultCurrentDirectoryInExePath -ErrorAction SilentlyContinue
$env:Path = "$Proyecto;$env:Path"

$bubblewrap = Join-Path $env:APPDATA 'npm\bubblewrap.cmd'
if (-not (Test-Path $bubblewrap)) { $bubblewrap = 'bubblewrap' }
& $bubblewrap build --skipPwaValidation

if (Test-Path 'app-release-signed.apk') {
  Write-Host ""
  Write-Host "Listo: $Proyecto\app-release-signed.apk"
  Write-Host "Cópialo a mis-gastos-app\descargas\Tebille.apk y publica el sitio."
}
