import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow local network devices to reach Next.js dev-only assets and HMR.
  allowedDevOrigins: [
    '127.0.0.1',
    '*.local',
    '*.localdomain',
    '192.168.*.*',
    '10.*.*.*',
    '172.*.*.*',
  ],
};

export default nextConfig;
