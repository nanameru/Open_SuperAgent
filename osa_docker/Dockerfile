# Dockerfile

# ベースイメージとして node:22.16-alpine を指定
FROM node:22.16-alpine

# --- ビルド引数の定義 ---
# ビルド時に外部から値を受け取るための変数を定義します。
# GIT_REPO_URL: クローンするGitリポジトリのURL
# BRANCH_NAME: クローンするブランチ名 (デフォルト: main)
# APP_PORT: アプリケーションが使用するポート (デフォルト: 3000)
ARG GIT_REPO_URL
ARG BRANCH_NAME=new-branch-name
ARG APP_PORT=3000

# --- ビルドステージ ---
# Alpine Linuxにgitパッケージをインストール
RUN apk add --no-cache git

# アプリケーションの作業ディレクトリを作成
WORKDIR /usr/src/app

# gitリポジトリからソースコードをクローン
# --single-branch オプションで指定したブランチのみを取得し、ビルドを高速化します。
RUN git clone --branch ${BRANCH_NAME} --single-branch ${GIT_REPO_URL} .

# package.jsonの依存ライブラリをインストール
RUN npm install

# アプリケーションがリッスンするポートをコンテナに公開
EXPOSE ${APP_PORT}

# デフォルトの起動コマンド (compose.yaml や docker run で上書きされる)
CMD [ "npm", "start" ]