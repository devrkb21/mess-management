<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Configured to allow all Local Area Network (LAN) devices, mobile phones,
    | emulators, and local development ports to communicate seamlessly.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8081',
        'http://127.0.0.1:8081',
    ],

    // Allows ANY IP address in 192.168.*.* with any port (e.g. 192.168.0.121:3000 or :8081)
    'allowed_origins_patterns' => [
        '#^https?://192\.168\.\d+\.\d+(:\d+)?$#',
        '#^https?://10\.0\.2\.2(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
        '#^https?://localhost(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
