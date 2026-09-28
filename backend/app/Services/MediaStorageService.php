<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

class MediaStorageService
{
    /**
     * Resolve the active media disk.
     *
     * Uses Cloudflare R2 (S3-compatible) when R2_BUCKET is configured,
     * otherwise falls back to the local 'public' disk so local dev
     * and tests run without any bucket credentials.
     */
    public function disk(): Filesystem
    {
        if (config('filesystems.disks.r2.bucket')) {
            return Storage::disk('r2');
        }

        return Storage::disk('public');
    }

    /**
     * Which disk is active — useful for diagnostics and responses.
     */
    public function activeDiskName(): string
    {
        return config('filesystems.disks.r2.bucket') ? 'r2' : 'public';
    }

    /**
     * Store an uploaded file under the given directory and return its public URL.
     */
    public function storeUpload($file, string $directory): string
    {
        $disk = $this->disk();

        $path = $file->store($directory, $this->activeDiskName());

        return $this->resolveUrl($disk, $path);
    }

    /**
     * Store a file from raw contents (e.g. generated PDFs) and return its public URL.
     */
    public function storeContents(string $directory, string $name, string $contents): string
    {
        $disk = $this->disk();

        $path = "{$directory}/{$name}";

        $disk->put($path, $contents);

        return $this->resolveUrl($disk, $path);
    }

    /**
     * Delete a file from the active disk given its stored URL or path.
     */
    public function deleteByUrl(?string $url): bool
    {
        if (! $url) {
            return false;
        }

        $disk = $this->disk();

        // Strip the configured base URL (or APP_URL/storage for local) to get the key
        $bases = array_filter([
            config('filesystems.disks.r2.url'),
            rtrim(config('app.url'), '/').'/storage',
        ]);

        $path = $url;

        foreach ($bases as $base) {
            if ($base && str_starts_with($url, $base)) {
                $path = ltrim(substr($url, strlen($base)), '/');

                break;
            }
        }

        return $disk->delete($path);
    }

    /**
     * Temporary signed download URL. Works on R2 when the bucket is kept
     * private (plan Part 6 #5) — the local public disk always returns
     * a plain public URL.
     */
    public function temporaryUrl(string $path, ?\DateTimeInterface $expiresAt = null): string
    {
        $disk = $this->disk();

        if ($this->activeDiskName() === 'r2') {
            return $disk->temporaryUrl($path, $expiresAt ?? now()->addMinutes(15));
        }

        return $this->resolveUrl($disk, $path);
    }

    protected function resolveUrl(Filesystem $disk, string $path): string
    {
        // S3/R2 disks expose url() with the configured R2_PUBLIC_URL base
        return $disk->url($path);
    }
}
