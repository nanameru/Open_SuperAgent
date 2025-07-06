# Google Workspace API設定ガイド

## はじめに

Google Docs、Sheets、Slidesの自動作成機能を使用するには、Google Cloud Platform (GCP) でサービスアカウントを設定し、認証情報を取得する必要があります。

## エラー「Login Required」の原因

以下のいずれかが原因です：
- Google Cloud Console でAPIが有効化されていない
- サービスアカウントキーが正しく設定されていない
- サービスアカウントに必要な権限が付与されていない

## 詳細設定手順

### 1. Google Cloud Platform (GCP) プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. プロジェクト名を設定（例：`ai-agent-workspace`）

### 2. 必要なAPIの有効化

以下のAPIを **すべて** 有効化してください：

```
Google Docs API
Google Sheets API  
Google Slides API
Google Drive API
```

**手順：**
1. Google Cloud Console で「APIとサービス」→「ライブラリ」に移動
2. 上記の各APIを検索し、「有効にする」をクリック
3. 4つすべてのAPIが有効になっていることを確認

### 3. サービスアカウントの作成

1. **「APIとサービス」→「認証情報」** に移動
2. **「認証情報を作成」→「サービスアカウント」** をクリック
3. サービスアカウント情報を入力：
   - **名前**: `ai-agent-service-account`
   - **説明**: `AI agent workspace access`
4. **「完了」** をクリック

### 4. サービスアカウントキーの生成

1. 作成したサービスアカウントをクリック
2. **「キー」タブ** → **「鍵を追加」** → **「新しい鍵を作成」**
3. **「JSON」形式** を選択
4. **「作成」** をクリック → JSONファイルがダウンロードされます

### 5. 環境変数の設定

#### 5-1. JSONファイルの内容をコピー

ダウンロードしたJSONファイルを開き、全体をコピーしてください。

内容例：
```json
{
  "type": "service_account",
  "project_id": "your-project-12345",
  "private_key_id": "abcdef123456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...==\n-----END PRIVATE KEY-----\n",
  "client_email": "ai-agent-service-account@your-project-12345.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/ai-agent-service-account%40your-project-12345.iam.gserviceaccount.com"
}
```

#### 5-2. 環境変数ファイルの設定

1. プロジェクトルートの `.env.local` ファイルを開く
2. 以下の行を追加（JSONを1行にまとめて設定）：

```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-12345","private_key_id":"abcdef123456...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQ...==\n-----END PRIVATE KEY-----\n","client_email":"ai-agent-service-account@your-project-12345.iam.gserviceaccount.com","client_id":"123456789012345678901","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/ai-agent-service-account%40your-project-12345.iam.gserviceaccount.com"}
```

**重要：** 改行を含む `private_key` は `\n` でエスケープしてください。

### 6. Google Drive での共有設定（オプション）

作成したファイルを特定のユーザーと共有したい場合：

1. Google Drive で **共有フォルダ** を作成
2. サービスアカウントのメールアドレス（`client_email`）を共有相手として追加
3. **編集者権限** を付与

## トラブルシューティング

### エラー: "Login Required" (401)

**原因と解決方法：**

1. **APIが有効化されていない**
   ```
   解決方法: Google Cloud Console でDocs/Sheets/Slides/Drive APIをすべて有効化
   ```

2. **JSONの形式エラー**
   ```
   解決方法: JSONが正しく1行になっているか確認。特に private_key の改行を \n でエスケープ
   ```

3. **サービスアカウントの権限不足**
   ```
   解決方法: サービスアカウントにDrive API権限が付与されているか確認
   ```

### エラー: "Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON"

**解決方法：**
- JSONの構文が正しいか確認
- 特殊文字（`\n`, `"`）が正しくエスケープされているか確認
- オンラインJSON検証ツールで構文チェック

### エラー: "Insufficient Permission"

**解決方法：**
1. Google Cloud Console で以下を確認：
   - 4つのAPIがすべて有効化されているか
   - サービスアカウントが存在するか
   - キーが有効期限内か

## セキュリティのベストプラクティス

1. **JSONキーファイルの管理**
   - 秘密鍵ファイルはGitにコミットしない
   - `.env.local` は `.gitignore` に追加済み

2. **権限の最小化**
   - 必要最小限のAPIのみ有効化
   - 不要になったサービスアカウントは削除

3. **定期的なローテーション**
   - サービスアカウントキーを定期的に更新
   - 古いキーは無効化

## 動作確認

設定が完了したら、チャットで以下を試してください：

```
「AIについてのレポート」というタイトルでGoogle Docsを作成して
```

成功すると以下のような応答が返されます：
- ドキュメントID
- 編集用URL
- 作成成功メッセージ

## サポート

設定でお困りの場合は、以下を確認してください：
1. 4つのAPIがすべて有効化されているか
2. サービスアカウントが正しく作成されているか
3. JSON形式が正しいか（特に改行のエスケープ）
4. 環境変数が正しく設定されているか

---

**参考リンク：**
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Google Docs API Documentation](https://developers.google.com/docs/api)