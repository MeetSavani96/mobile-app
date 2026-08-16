<?php
/**
 * AKV Energy — Simple stateless JWT helper using HS256.
 */

class JWTHelper {
    /**
     * Get the JWT secret key. Matches env variable or uses secure default.
     */
    private static function getSecret(): string {
        $secret = getenv('JWT_SECRET');
        if (!$secret && isset($_ENV['JWT_SECRET'])) {
            $secret = $_ENV['JWT_SECRET'];
        }
        if (!$secret && isset($_SERVER['JWT_SECRET'])) {
            $secret = $_SERVER['JWT_SECRET'];
        }
        if (!$secret) {
            $secret = 'akv_energy_secret_jwt_key_2026_production_secure_key';
        }
        return $secret;
    }

    /**
     * Safe Base64URL encoding.
     */
    public static function base64UrlEncode(string $data): string {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    /**
     * Safe Base64URL decoding.
     */
    public static function base64UrlDecode(string $data): ?string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        $decoded = base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
        return $decoded === false ? null : $decoded;
    }

    /**
     * Generate a new signed JWT.
     * Defaults to 30 days expiration matching standard login token.
     */
    public static function generate(array $payload, int $expirySeconds = 2592000): string {
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        // Inject standard claims
        $payload['iat'] = time();
        $payload['exp'] = time() + $expirySeconds;

        $secret = self::getSecret();

        $encodedHeader = self::base64UrlEncode(json_encode($header));
        $encodedPayload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "{$encodedHeader}.{$encodedPayload}", $secret, true);
        $encodedSignature = self::base64UrlEncode($signature);

        return "{$encodedHeader}.{$encodedPayload}.{$encodedSignature}";
    }

    /**
     * Verify the signature & expiration of a token. Returns payload array or null.
     */
    public static function verify(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($encodedHeader, $encodedPayload, $encodedSignature) = $parts;

        try {
            $secret = self::getSecret();

            // Verify signature
            $expectedSignature = self::base64UrlEncode(
                hash_hmac('sha256', "{$encodedHeader}.{$encodedPayload}", $secret, true)
            );

            if (!hash_equals($expectedSignature, $encodedSignature)) {
                return null;
            }

            // Decode payload
            $payloadJson = self::base64UrlDecode($encodedPayload);
            if (!$payloadJson) {
                return null;
            }

            $payload = json_decode($payloadJson, true);
            if (!is_array($payload)) {
                return null;
            }

            // Check expiration
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return null;
            }

            return $payload;
        } catch (Exception $e) {
            return null;
        }
    }
}
