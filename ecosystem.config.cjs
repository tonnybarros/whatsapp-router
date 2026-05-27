module.exports = {
  apps: [
    {
      name: "whatsapp-router",
      script: "src/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
