FROM php:8.5-cli-alpine

# Allow large media uploads (walk-through videos up to 50 MB).
RUN echo "upload_max_filesize=64M\npost_max_size=68M\nmemory_limit=256M" \
    > /usr/local/etc/php/conf.d/uploads.ini

RUN apk add --no-cache $PHPIZE_DEPS icu-dev libpq-dev libzip-dev oniguruma-dev \
    && docker-php-ext-install intl mbstring pdo_pgsql zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --no-scripts

COPY . .
RUN composer dump-autoload --no-dev --optimize

EXPOSE 8000

CMD ["sh", "-c", "php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8000"]