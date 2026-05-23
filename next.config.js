/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'whatsapp-web.js',
      'puppeteer',
      'puppeteer-core',
      'qrcode',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(
        'whatsapp-web.js',
        'puppeteer',
        'puppeteer-core',
        'bufferutil',
        'utf-8-validate',
      );
    }
    return config;
  },
};

module.exports = nextConfig;
