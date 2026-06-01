<?php
/**
 * Proxy temporal mismo origen (Neubox / IIS sin ARR).
 * Reenvía /security-api/* y /pos-api/* al API real vía servidor (sin CORS ni SSL en el navegador).
 */
declare(strict_types=1);

$allowedOrigin = 'https://elitegym247.tanosi.com.mx';

header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Tenant-Id, X-Branch-Id');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$backend = $_GET['backend'] ?? '';
$path = $_GET['path'] ?? '';

if ($path === '' || $path[0] !== '/') {
    $path = '/' . ltrim($path, '/');
}

$targets = [
    'security' => 'https://apisecuritygetest.tanosi.com.mx',
    'pos' => 'https://pos.elitegym247.tanosi.com.mx',
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

$forwardHeaders = [];
$contentType = $_SERVER['HTTP_CONTENT_TYPE'] ?? $_SERVER['CONTENT_TYPE'] ?? '';
if ($contentType !== '') {
    $forwardHeaders[] = 'Content-Type: ' . $contentType;
}
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if ($auth !== '') {
    $forwardHeaders[] = 'Authorization: ' . $auth;
}
$tenant = $_SERVER['HTTP_X_TENANT_ID'] ?? '';
if ($tenant !== '') {
    $forwardHeaders[] = 'X-Tenant-Id: ' . $tenant;
}
$branch = $_SERVER['HTTP_X_BRANCH_ID'] ?? '';
if ($branch !== '') {
    $forwardHeaders[] = 'X-Branch-Id: ' . $branch;
}
$forwardHeaders[] = 'Accept: application/json';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $forwardHeaders,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 90,
    // Certificado Neubox del API aún en host svw*.serverneubox.com.mx
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
]);

if (in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
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
    header('Content-Type: application/json; charset=utf-8');
}

echo $responseBody;
