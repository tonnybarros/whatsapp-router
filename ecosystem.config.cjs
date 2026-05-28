module.exports = {
  apps: [
    {
      name: "whatsapp-router-v3",
      script: "src/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
