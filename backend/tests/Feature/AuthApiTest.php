<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register(): void
    {
        $payload = [
            'name' => 'Tanvir Ahmed',
            'email' => 'tanvir@example.com',
            'phone' => '01712345678',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'phone'],
                'token',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'tanvir@example.com',
            'phone' => '01712345678',
        ]);
    }

    public function test_duplicate_email_or_phone_fails(): void
    {
        User::create([
            'name' => 'Existing',
            'email' => 'tanvir@example.com',
            'phone' => '01712345678',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Another',
            'email' => 'tanvir@example.com',
            'phone' => '01712345678',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'phone']);
    }

    public function test_user_can_login_and_logout(): void
    {
        $user = User::create([
            'name' => 'Sadman Sakib',
            'email' => 'sadman@example.com',
            'phone' => '01812345678',
            'password' => 'password123',
        ]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'sadman@example.com',
            'password' => 'password123',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'user', 'token']);

        $token = $loginResponse->json('token');

        // Access protected /me
        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/me');

        $meResponse->assertStatus(200)
            ->assertJsonPath('user.email', 'sadman@example.com');

        // Logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');

        $logoutResponse->assertStatus(200);
    }
}
