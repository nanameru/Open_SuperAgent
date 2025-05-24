import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestShadcnPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">shadcn/ui テスト</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Buttonコンポーネント</CardTitle>
            <CardDescription>さまざまなButtonのバリエーション</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-x-2">
              <Button>Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="space-x-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inputコンポーネント</CardTitle>
            <CardDescription>入力フィールドのテスト</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="プレースホルダーテキスト" />
            <Input type="email" placeholder="メールアドレス" />
            <Input type="password" placeholder="パスワード" />
            <Input disabled placeholder="無効な入力フィールド" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TailwindCSS v4 + shadcn/ui</CardTitle>
          <CardDescription>カスタムスタイルとの組み合わせテスト</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
            <p className="text-lg font-semibold">TailwindCSS v4 グラデーション背景</p>
            <p className="text-sm opacity-90">shadcn/uiコンポーネントと組み合わせて使用できます</p>
            <div className="mt-4">
              <Button variant="secondary" className="bg-white text-gray-900 hover:bg-gray-100">
                カスタムスタイルボタン
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 