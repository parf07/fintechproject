const { defineConfig } = require("vite");
const reactPlugin = require("@vitejs/plugin-react");

module.exports = defineConfig({
  plugins: [reactPlugin.default ? reactPlugin.default() : reactPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
