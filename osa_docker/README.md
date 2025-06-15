### OpenSuperAgent コンテナ　概要

1.  `Dockerfile`: Dockerイメージの設計図です。ソースコードの取得、依存関係のインストールなどを行います。
2.  `compose.yaml`: Dockerコンテナの起動設定を記述します。ビルド時の引数やポートフォワード、起動コマンドなどを指定します。
3.  `.env`: `compose.yaml` で使用する環境変数を定義するファイルです。リポジトリのURLやブランチ名などを一元管理します。

これらのファイルだけを同じディレクトリに配置して使用します。

### 1. Dockerfile

このファイルは、GitのOpenSuperAgentリポジトリから指定されたブランチ（デフォルトではnew-branch-name）のソースコードをクローンし、Node.jsの依存関係をインストールするDockerイメージを構築します。

＜基本的に変更の必要なし＞

---

### 2. compose.yaml

このファイルは、`Dockerfile` を使ってコンテナをビルドし、実行するための設定を定義します。ビルド引数、ポートマッピング、エントリーポイント（起動コマンド）をここで指定します。

＜基本的に変更の必要なし＞

---

### 3. .env ファイル

`.env.example` をリネームして利用してください。
`compose.yaml` で使用する変数を定義します。このファイルを編集するだけで、ビルド設定を簡単に変更できます。

このファイルに各種APIKEY情報などを設定してください。

APIKEY部分はOpenSuperAgentと同じです。
★ここだけ、OpenSuperAgentの `.env.example` が変更になった場合、同じ内容になるように追従する必要があります。

下記は`.env.example`のうち、コンテナ起動に関連する設定です。
```env
# --- コンテナ起動用環境変数 ----
# --- Gitリポジトリの情報 ---
# クローンしたいリポジトリのURLを指定
GIT_REPO_URL=https://github.com/nanameru/Open_SuperAgent.git
# クローンしたいブランチ名を指定
BRANCH_NAME=new-branch-name

# --- ポート設定 ---
# コンテナが公開するポート（DockerfileのEXPOSEと合わせる）
APP_PORT=3000
# ホストマシンで待ち受けるポート
HOST_PORT=3000
```

---

### 実行方法

1.  上記3つのファイル（`Dockerfile`, `compose.yaml`, `.env`）を同じディレクトリに作成します。
2.  `.env` ファイル内の各種API-KEYなどを自身の情報に書き換えます。
3.  `.env` ファイル内の `GIT_REPO_URL` や `BRANCH_NAME` などを、必要に応じて編集します。　※編集しない場合はOpenSuperAgentの最新版が起動します。
4.  ターミナルでそのディレクトリに移動し、以下のコマンドを実行します。

```bash
# Dockerイメージをビルドし、コンテナをバックグラウンドで起動
# (Docker Compose V2 の場合)
docker compose up --build -d

# (古いバージョンの場合)
# docker-compose up --build -d
```

これで、OpenSuperAgentのソースが自動でクローン（取得）され、依存関係がインストールされたコンテナが起動します。
ホストマシンの `3000` 番ポート（`.env` で指定）にアクセスすると、コンテナ内のOpenSuperAgentに接続できます。
http://localhost:3000/


**その他のコマンド**

* **コンテナの停止と削除:**
    ```bash
    docker-compose down
    ```
* **ログの確認:**
    ```bash
    docker-compose logs -f
    ```