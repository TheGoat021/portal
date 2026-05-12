module.exports = {
  apps: [
    {
      name: "axion-voice",
      cwd: "/opt/axion/voice-server",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
        PORT: 4001
      },
      error_file: "/var/log/axion-voice/error.log",
      out_file: "/var/log/axion-voice/out.log",
      merge_logs: true,
      time: true
    }
  ]
}
