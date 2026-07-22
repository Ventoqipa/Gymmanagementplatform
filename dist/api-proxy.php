<?php
/**
 * Proxy temporal mismo origen (Neubox / IIS sin ARR).
 * Reenvía /security-api/*, /pos-api/*, /catalog-api/* y /docs-api/* al backend.
 *
 * DocsEG — prioridad de credenciales:
 * 1) docs-proxy.local.php (junto a este archivo en dist/)
 * 2) variables de entorno del hosting (DOCS_USERNAME / DOCS_PASSWORD)
 * 3) archivo .env en la misma carpeta que api-proxy.php (si lo subes a Neubox)
 *
 * Nota: el .env de Vite en el repo NO se aplica solo; el PHP no lo lee en el build.
 * Hay que subir docs-proxy.local.php o un .env con DOCS_* al servidor.
 */
declare(strict_types=1);

$allowedOrigin = 'https://elitegym247.tanosi.com.mx';

header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key, X-Tenant-Id, X-Branch-Id, X-HTTP-Method-Override');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$backend = $_GET['backend'] ?? '';
$path = $_GET['path'] ?? '';

if ($path === '' || $path[0] !== '/') {
    $path = '/' . ltrim($path, '/');
}

/**
 * Lee KEY=VALUE de un .env (soporta comillas y # en el valor entre comillas).
 *
 * @return array<string, string>
 */
function egLoadEnvFile(string $filePath): array
{
    if (!is_file($filePath) || !is_readable($filePath)) {
        return [];
    }
    $out = [];
    $lines = file($filePath, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return [];
    }
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }
        $eq = strpos($trimmed, '=');
        if ($eq === false) {
            continue;
        }
        $key = trim(substr($trimmed, 0, $eq));
        $value = trim(substr($trimmed, $eq + 1));
        if ($key === '') {
            continue;
        }
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }
        $out[$key] = $value;
    }
    return $out;
}

$docsUser = getenv('DOCS_USERNAME') ?: '';
$docsPass = getenv('DOCS_PASSWORD') ?: '';
$docsTarget = getenv('DOCS_PROXY_TARGET') ?: 'https://docs.tanosi.com.mx';

// .env junto al proxy (útil en Neubox si subes el .env dentro de dist/)
$envFromFile = egLoadEnvFile(__DIR__ . '/.env');
if ($docsUser === '' && !empty($envFromFile['DOCS_USERNAME'])) {
    $docsUser = $envFromFile['DOCS_USERNAME'];
}
if ($docsPass === '' && !empty($envFromFile['DOCS_PASSWORD'])) {
    $docsPass = $envFromFile['DOCS_PASSWORD'];
}
if (!empty($envFromFile['DOCS_PROXY_TARGET'])) {
    $docsTarget = $envFromFile['DOCS_PROXY_TARGET'];
}

$localDocsConfig = __DIR__ . '/docs-proxy.local.php';
if (is_file($localDocsConfig)) {
    /** @var array{username?:string,password?:string,target?:string} $docsLocal */
    $docsLocal = require $localDocsConfig;
    if (!empty($docsLocal['username'])) {
        $docsUser = (string) $docsLocal['username'];
    }
    if (!empty($docsLocal['password'])) {
        $docsPass = (string) $docsLocal['password'];
    }
    if (!empty($docsLocal['target'])) {
        $docsTarget = (string) $docsLocal['target'];
    }
}

if ($backend === 'docs' && ($docsUser === '' || $docsPass === '')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'Faltan credenciales DocsEG en el servidor. En Neubox el .env de Vite no se usa solo: sube docs-proxy.local.php (copia de docs-proxy.local.php.example) junto a api-proxy.php, o un .env en esa misma carpeta con DOCS_USERNAME y DOCS_PASSWORD.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$targets = [
    'security' => 'https://apisecurityegtest.tanosi.com.mx',
    'pos' => 'https://elitegym247.pos.tanosi.com.mx',
    'catalog' => 'https://apicatalogsegtest.tanosi.com.mx',
    'docs' => rtrim($docsTarget, '/'),
];

if (!isset($targets[$backend])) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Backend no válido.']);
    exit;
}

$url = $targets[$backend] . $path;

$extraQuery = [];
if (!empty($_SERVER['QUERY_STRING'])) {
    parse_str($_SERVER['QUERY_STRING'], $qs);
    unset($qs['backend'], $qs['path']);
    $extraQuery = $qs;
}
if ($extraQuery !== []) {
    $url .= '?' . http_build_query($extraQuery);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input');

// El front envía POST + X-HTTP-Method-Override (IIS bloquea PUT/DELETE).
// Al API Tanosi hay que reenviar el verbo real.
$methodOverride = strtoupper(trim($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? ''));
$allowedOverrides = ['PUT', 'DELETE', 'PATCH'];
$upstreamMethod =
    $method === 'POST' && in_array($methodOverride, $allowedOverrides, true)
        ? $methodOverride
        : $method;

$forwardHeaders = [];
$contentType = $_SERVER['HTTP_CONTENT_TYPE'] ?? $_SERVER['CONTENT_TYPE'] ?? '';
if ($contentType !== '') {
    $forwardHeaders[] = 'Content-Type: ' . $contentType;
}

if ($backend === 'docs') {
    $forwardHeaders[] = 'Authorization: Basic ' . base64_encode($docsUser . ':' . $docsPass);
    $forwardHeaders[] = 'Accept: */*';
} else {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($auth !== '') {
        $forwardHeaders[] = 'Authorization: ' . $auth;
    }
    $forwardHeaders[] = 'Accept: application/json';
}

$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($apiKey !== '') {
    $forwardHeaders[] = 'X-Api-Key: ' . $apiKey;
}
$tenant = $_SERVER['HTTP_X_TENANT_ID'] ?? '';
if ($tenant !== '') {
    $forwardHeaders[] = 'X-Tenant-Id: ' . $tenant;
}
$branch = $_SERVER['HTTP_X_BRANCH_ID'] ?? '';
if ($branch !== '') {
    $forwardHeaders[] = 'X-Branch-Id: ' . $branch;
}
$methodOverride = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '';
if ($methodOverride !== '') {
    $forwardHeaders[] = 'X-HTTP-Method-Override: ' . $methodOverride;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $upstreamMethod,
    CURLOPT_HTTPHEADER => $forwardHeaders,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 90,
    // Certificado Neubox del API aún en host svw*.serverneubox.com.mx
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
]);

if (in_array($upstreamMethod, ['POST', 'PUT', 'PATCH'], true)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'No se pudo conectar al API: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

http_response_code($status);

$sentContentType = false;
foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0) {
        continue;
    }
    if (stripos($line, 'Transfer-Encoding:') === 0) {
        continue;
    }
    if (stripos($line, 'Connection:') === 0) {
        continue;
    }
    if (stripos($line, 'Access-Control-') === 0) {
        continue;
    }
    if (stripos($line, 'Content-Type:') === 0) {
        header($line);
        $sentContentType = true;
    }
}

if (!$sentContentType) {
    header(
        $backend === 'docs'
            ? 'Content-Type: application/octet-stream'
            : 'Content-Type: application/json; charset=utf-8'
    );
}

echo $responseBody;
