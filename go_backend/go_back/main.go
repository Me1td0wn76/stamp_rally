package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	// controller パッケージ：各APIエンドポイントの処理関数が定義されている
	controller "go_back/go_backend/go_back/Controller"

	// gin：GoのWebフレームワーク。ルーティングやJSONレスポンスを簡単に扱える
	"github.com/gin-gonic/gin"
)

func main() {
	// gin.Default() でルーター（どのURLにどの処理を割り当てるか管理するもの）を作成する
	// gin.Default() は標準のログ出力とパニック回復機能を自動で有効にしてくれる
	r := gin.Default()

	// CORS（Cross-Origin Resource Sharing）の設定はしない
	// フロントエンドは Vite の proxy(本番はリバースプロキシ)を通して同じオリジンとして /api を呼ぶため、CORS は不要
	// (以前は http://localhost:5173 だけを許可していたが、ブラウザは同一オリジンでも POST には Origin ヘッダーを付けるため、
	//  HTTPS 化やスマホから IP で開いたときに Origin が一致せず 403 になっていた)
	// 別オリジンからのリクエストは、ブラウザが応答を読ませず、POST には Cookie(SameSite=Lax)も付かないので安全性は変わらない

	// ルートグループ：/api というプレフィックスをまとめて付けられる
	// 例：api.GET("/spots") → 実際のURLは /api/spots になる
	// APIのURLを /api 以下にまとめることで、将来的にバージョン管理（/api/v2/...）などがしやすくなる
	api := r.Group("/api")
	{
		// GET /api/spots：スポット一覧を取得する
		api.GET("/spots", controller.GetSpots)

		// POST /api/users：ユーザーIDを発行し、HttpOnly Cookie に保存する
		api.POST("/users", controller.PostUser)

		// ここから下はユーザーごとのAPI
		// RequireUser ミドルウェアが Cookie からユーザーIDを取り出す（無ければ 401）
		user := api.Group("", controller.RequireUser())
		{
			// POST /api/stamps：スポットIDを指定してスタンプを取得する（手動）
			user.POST("/stamps", controller.PostStamp)

			// POST /api/stamps/nfc：NFCタグのUIDを使ってスタンプを取得する
			user.POST("/stamps/nfc", controller.PostStampByNfc)

			// POST /api/stamps/qr : QRコードを使ってスタンプを取得する
			user.POST("/stamps/qr", controller.PostStampByQr)

			// GET /api/stamps：ユーザーの取得済みスタンプ一覧を返す
			user.GET("/stamps", controller.GetUserStamps)

			// GET /api/bingo：ユーザーのビンゴ達成状況を返す
			user.GET("/bingo", controller.GetBingo)
		}

		// ここから下は管理用API(環境変数 ADMIN_PASSWORD を設定したときだけ有効)
		// 管理画面(/admin)のログインフォームから使う。ブラウザで URL を直接開くと、ユーザー名(admin)とパスワードを聞かれる(Basic 認証)
		if adminAuth := controller.AdminAuth(); adminAuth != nil {
			admin := api.Group("/admin", adminAuth)
			{
				// GET /api/admin/summary：参加者数・ビンゴ達成数・スポットごと・時間帯ごとのスタンプ数などの概要を返す
				admin.GET("/summary", controller.GetAdminSummary)

				// GET /api/admin/staff-stamps：スタッフ別トークン(CodeFlow)で押されたスタンプの記録・スタッフごとの数を返す
				admin.GET("/staff-stamps", controller.GetStaffStamps)

				// GET /api/admin/links：QRコード・NFCタグに書き込むトークンをスポット・スタッフごとに返す
				admin.GET("/links", controller.GetAdminLinks)
			}
		}
	}

	// 本番用：環境変数 STATIC_DIR にビルド済みフロントエンド(vite build の dist)の場所が入っていれば、このサーバーから配信する
	// 画面と API が同じオリジンになるので、リバースプロキシや CORS の設定をしなくても Cookie がそのまま使える
	// 未設定(開発時)は今まで通り API だけを返し、画面は Vite の開発サーバーが担当する
	if staticDir := os.Getenv("STATIC_DIR"); staticDir != "" {
		serveFrontend(r, staticDir)
	}

	// サーバーを起動する
	// r.Run() は引数を省略すると環境変数 PORT のポートで待ち受け、PORT が無ければ 8080 番を使う
	// (Render などのホスティングサービスは、待ち受けるポートを PORT で渡してくる)
	// r.Run() はサーバーが起動し続けるブロッキング処理なので、エラーが起きたときだけ終了する
	// log.Fatalf はエラーメッセージを出力してプログラムを終了させる
	if err := r.Run(); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

// serveFrontend は、どのルートにも当てはまらなかったリクエストに対してビルド済みフロントエンドを返す
func serveFrontend(r *gin.Engine, dir string) {
	fileServer := http.FileServer(http.Dir(dir))
	indexPath := filepath.Join(dir, "index.html")

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// 存在しない API や、GET 以外のリクエストには画面ではなく 404 を返す
		isAPI := path == "/api" || strings.HasPrefix(path, "/api/")
		isRead := c.Request.Method == http.MethodGet || c.Request.Method == http.MethodHead
		if isAPI || !isRead {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		// 実在するファイル(JS・CSS・画像など)はそのまま返す
		// filepath.Clean で "../" を取り除き、dir の外のファイルを読ませない
		filePath := filepath.Join(dir, filepath.Clean("/"+path))
		if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
			// assets 以下はファイル名にハッシュが入り、中身が変われば名前も変わるので、長くキャッシュさせてよい
			if strings.HasPrefix(path, "/assets/") {
				c.Header("Cache-Control", "public, max-age=31536000, immutable")
			}
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}

		// それ以外(/ や /mock/... など)は index.html を返し、画面の切り替えは React Router に任せる
		// index.html はデプロイのたびに読み込む JS のファイル名が変わるので、毎回サーバーに確認させる
		c.Header("Cache-Control", "no-cache")
		c.File(indexPath)
	})
}
