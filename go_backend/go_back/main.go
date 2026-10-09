package main

import (
	"log"

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
	}

	// サーバーを8080番ポートで起動する
	// r.Run() はサーバーが起動し続けるブロッキング処理なので、エラーが起きたときだけ終了する
	// log.Fatalf はエラーメッセージを出力してプログラムを終了させる
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
