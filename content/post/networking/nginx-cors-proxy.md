---
title: Enable CORS when not Supported
comments: true
date: "2019-07-05T07:40:01Z"
categories: ["networking"]
tags: ["cors", "reverse proxy"]
---

Some services don't support [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS), but we can use NGINX to make CORS supported with this simple hack! To enable CORS on any service we need to have NGINX configured as a [Reverse Proxy](/post/networking/couchdb-nginx-proxy/) and have NGINX add a successful pre-flight response to the CORS pre-flight request. Read on to get this simple example to work.

Let's back all the way up on why CORS is needed? Security! What if we could write Javacript on a server somewhere and that Javascript could use any back-end server it wanted for requests? That would introduce huge security vulnerabilities. For example, I could write a webpage that looks like a store, but not have a back-end for the store at all and send bogus orders to another store somewhere else on the internet that my site isn't affiliated with. CORS gives us security that a front-end and back-end match up. From the back-end we can control what front-end has access to the back-end and also what requests that front-end can make.

CORS works on 3 levels: protocol, origin and port. That is if a browser is going to make a request to a server then the protocol, url and port must be the same as the page that the browser loaded. For example if from a page on the browser hosted on `https://lloydrochester.com:1123/example.html` if Javascript tries to make a request to say `http://lloydrochester.com` then it would not be allowed since both the prototcol - `http` instead of `https` and port `80` instead of `1123` would not be allowed. Also, the Javascript cannot make a call to an origin other than `lloydrochester.com`. This is all assuming, that CORS isn't enabled. When CORS is enabled we can get a lot of flexibility to allow clients to access back-ends many different origins.

Let's first digress into the [pre-flight request](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request). The pre-flight request is sent by the client - think the browser here - to check to see if the server will allow it to make a request. If a service doesn't support CORS then an unsuccessful response will be sent back from the pre-flight request. This is where NGINX comes in. We can have NGINX respond with a successful response for the pre-flight request and the browser will allow requests to go through to this service. This does require that the service is behind an NGINX reverse proxy.

## Example NGINX Configuration to Allow for CORS

Let's say we have a service that is running in Docker behind port 3000. When we go to a `/non-cors-service` on this server we want CORS enabled. The example below will listen for the pre-flight request which is an `OPTIONS` request and send a successful CORS response. The example will also add CORS headers of `Access-Control-Allow-Origin` and `Access-Control-Allow-Methods` to all responses. These headers allow CORS on the requests after the pre-flight request. Read through the example as comments are put throughout.

{{< highlight c >}}

server {
    server_name lloydrochester.com;
    listen 80;

    location /non-cors-service {
        proxy_pass http://127.0.0.1:3000/;
        add_header Access-Control-Allow-Origin * always; # change this to non-*
        add_header Access-Control-Allow-Methods * always; # be more specific if you can
        if ($request_method = OPTIONS ) {
          add_header Content-Length 0;
          add_header Allow "GET, POST, PUT, OPTIONS";
          add_header Access-Control-Allow-Origin * always; # change as well
          add_header Access-Control-Allow-Methods * always; # change as well
          add_header Access-Control-Allow-Headers "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since,Access-Control-Allow-Origin";
          return 200; # successful response code from the pre-flight request
        }
    }
}

{{< / highlight >}}

## Debugging CORS

The best way I've found to debug CORS is in the console of the browser. The network requests from the developer tools in some browsers won't show the CORS errors, but the console will. For debugging the back-end on the NGINX side run the server but also use the `nginx -t` command which will check for any configuration errors. Also, look in the logs when the server was started. Once you have the browser make requests you should see the headers set from the example above in the developer tools from the network.

