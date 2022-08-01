---
title: NGINX/CouchDB Reverse Proxy
comments: true
date: "2018-10-10T03:10:00Z"
categories: ["networking"]
tags: ["nginx", "couchdb", "reverse proxy"]
---

Using NGINX as a front-end server to forward to multiple back-end services works great by configuring NGINX as a reverse proxy. The reverse proxy configuration will have NGINX serve HTTP/HTTPS URLs and forward them to them to network addresses such as a database listening on HTTP at a specific port, API servers, static websites, etc. Basically we can turn NGINX into an HTTP router. NGINX is also a great front man for back-end services such as HTTPS and HTTP/2. For instance if you had a Database, API Server and static site you could have an SSL certificate just for NGINX and they would all be behind HTTPS and the reverse proxy would convert the HTTPS and send HTTP. That's a post for another time however.

In this post I wanted to show how you can use NGINX and Apache CouchDB to make a reverse proxy such as:

{{< figure src="/assets/svg/nginx-couchdb-reverse-proxy.svg" title="nginx couchdb reverse proxy" >}}

This reverse proxy will take in all requests to NGINX under `/couch/` and forward them to `127.0.01:5984` where CouchDB typically lives serving on port 5984. Sufficient to say CouchDB is living under the `/couch` HTTP route.

This allows Javascript requests (Axios, PouchDB, XMLHttpRequest ...) to access CouchDB directly without having any CORS issues since the URL is on the same (protocol,url,port) as the script is loaded.

Let's take a simple example for an NGINX configuration with CouchDB as a reverse proxy:

```
# filename: /etc/nginx/sites-available/lloydrochester.com
# Redirect http to https
server {
    server_name lloydrochester.com;
    listen 80;
    listen [::]:80;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;

    root /var/www/lloydrochester.com;

    index index.html;
    gzip_types text/plain application/javascript application/x-javascript text/javascript text/xml text/css application/json;

    server_name lloydrochester.com;

    location ~* .(jpg|jpeg|png|gif|ico|css|js)$ {
       expires 10d;
    }

    # static site html/css/javascript content
    location / {
        try_files $uri $uri/ /index.html;
    }

    # reverse proxy for couchdb
    location /couch {
        rewrite /couch/(.*) /$1 break;
        proxy_pass http://127.0.0.1:5984/;
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }


    ssl_certificate /etc/letsencrypt/live/lloydrochester.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/lloydrochester.com/privkey.pem; # managed by Certbot
}
```

This works great but as a reverse proxy but I will say I've had problems in the past with Fauxton working as it needs to server off a root URL. In this case you can setup a subdomain as say `couch.lloydrochester.com`. Note this needs a new A record in the DNS but will also serve Fauxton without any `rewrite` directive.

Another nginx configuration file that serves CouchDB under the couch.lloydrochester.com subdomain.

```
# filename: /etc/nginx/sites-available/couch.lloydrochester.com
# redirect http to https
server {
    server_name couch.lloydrochester.com;
    listen 80;
    listen [::]:80;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;

    gzip_types text/plain application/javascript application/x-javascript text/javascript text/xml text/css application/json;

    server_name couch.lloydrochester.com;

    ssl_certificate /etc/letsencrypt/live/couch.lloydrochester.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/couch.lloydrochester.com/privkey.pem; # managed by Certbot

    location ~* .(jpg|jpeg|png|gif|ico|css|js)$ {
       expires 10d;
    }

    # reverse proxy for couchdb
    location / {
        proxy_pass http://127.0.0.1:5984/;
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Note: if you have these files in `sites-available` be sure to have soft links to `sites-enabled`, as well as restart NGINX.

