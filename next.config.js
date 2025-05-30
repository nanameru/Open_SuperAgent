/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  experimental: {
    instrumentationHook: true, // OpenTelemetryトレーシングを有効化
  },
  webpack: (config, { isServer }) => {
    // クライアントサイドでのNode.jsモジュールの使用を無効化
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        querystring: false,
        worker_threads: false,
      };
    }
    return config;
  },
  // 静的ファイルの配信設定
  async headers() {
    return [
      {
        source: '/generated-videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 