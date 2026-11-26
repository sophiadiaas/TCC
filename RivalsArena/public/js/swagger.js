window.onload = () =>
  SwaggerUIBundle({
    url: "/api/openapi.json",
    dom_id: "#swagger-ui",
    requestInterceptor: (req) => {
      req.headers["X-Requested-With"] = "RivalsArena";
      req.credentials = "same-origin";
      return req;
    },
  });
