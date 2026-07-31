server {
    server_name rsexpressparking.com www.rsexpressparking.com;

    client_max_body_size 50M;

    root /var/www/rsexpressparking/frontend/dist;
    index index.html;

    # Enable Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;
    gzip_min_length 1024;

    # Trailing slash fix
    rewrite ^([^.]*[^/])$ $1/ permanent;

    # Vite gives production assets content-hashed filenames. They can be
    # cached permanently because a changed file receives a new URL.
    location ^~ /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # Never keep the SPA entry document in the browser or an intermediary
    # cache. It selects the current set of content-hashed application assets.
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ^~ /api/ {
        include proxy_params;
        proxy_pass http://unix:/var/www/rsexpressparking/backend/gunicorn.sock;

        # Proxy performance enhancements
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    location ^~ /admin-dashboard/ {
        include proxy_params;
        proxy_pass http://unix:/var/www/rsexpressparking/backend/gunicorn.sock;
    }

    location ^~ /admin/ {
        include proxy_params;
        proxy_pass http://unix:/var/www/rsexpressparking/backend/gunicorn.sock;
    }

    location /robots.txt {
        include proxy_params;
        proxy_pass http://unix:/var/www/rsexpressparking/backend/gunicorn.sock;
    }

    location ~ ^/sitemap.*\.xml$ {
        include proxy_params;
        proxy_pass http://unix:/var/www/rsexpressparking/backend/gunicorn.sock;
    }

    location /blogs.xml {
        include proxy_params;
        proxy_pass http://unix:/var/www/rsexpressparking/backend/gunicorn.sock;
    }

    location /static/ {
        alias /var/www/rsexpressparking/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /media/ {
        alias /var/www/rsexpressparking/backend/media/;
    }

    # Protect dotfiles
    location ~* /\.(env|git|htaccess|htpasswd|DS_Store|idea|vscode|npmrc) {
        deny all;
    }

    listen 443 ssl http2; # enabled HTTP/2
    ssl_certificate /etc/letsencrypt/live/rsexpressparking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rsexpressparking.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = rsexpressparking.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name rsexpressparking.com www.rsexpressparking.com;
    return 404;
}
