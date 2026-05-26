module.exports = {
  apps: [
    {
      name: "whatsapp-router",
      script: "src/server.js",
      cwd: "/var/www/sse/whatsapp-router",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
