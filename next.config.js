/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  experimental: {
    // instrumentationHook: true, // 非推奨のため削除
    turbo: {
      rules: {
        // Turbopack用のルール設定
        '*.md': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
        '*.LICENSE': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
      },
    },
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
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // @libsql関連ファイルの処理
    config.module.rules.push({
      test: /\.(md|LICENSE)$/,
      type: 'asset/source',
    });

    // Stagehandとの互換性のための設定（Playwrightは内部で使用されるため外部化不要）

    return config;
  },
  // サーバー外部パッケージの設定
  serverExternalPackages: [
    // libsqlパッケージを外部化から除外
    '!@libsql/client',
    '!libsql',
  ],
  // 静的ファイルの配信設定
  async headers() {
    return [
      {
        source: '/generated-images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/generated-videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/generated-music/:path*',
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