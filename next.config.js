/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // swcMinify: false, // Webpackのminifyエラーを回避
  turbopack: {
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
        // HTMLファイルを処理するためのルールを追加
        '**/*.html': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
        // Turbopack用のフォントローダー設定を修正
        '**/*.ttf': {
          loaders: ['file-loader'],
          as: '*.js',
        },
        // Playwright関連のフォントファイルを無視
        '**/playwright-core/**/*.ttf': false,
        '**/playwright-core/**/assets/**': false,
      },
    },
  experimental: {
    // instrumentationHook: true, // 非推奨のため削除
  },
  webpack: (config, { isServer }) => {
    // Webpackの最小化を無効化
    config.optimization.minimize = false;
    
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
      test: /\.(md|LICENSE|html)$/,
      type: 'asset/source',
    });

    // フォントファイルを処理するためのルールを追加
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
    });

    // Playwright関連ファイルを除外
    config.module.rules.push({
      test: /playwright-core.*\.(ttf|js)$/,
      use: 'ignore-loader',
    });

    // Stagehandとの互換性のための設定（Playwrightは内部で使用されるため外部化不要）

    return config;
  },
  // サーバー外部パッケージの設定
  serverExternalPackages: [
    // libsqlパッケージを外部化から除外
    '!@libsql/client',
    '!libsql',
    // Playwrightパッケージを外部化リストに追加（内部処理用）
    'playwright',
    'playwright-core',
    '@playwright/test',
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