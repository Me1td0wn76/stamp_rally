package main

import (
	"log"

	// controller パッケージ：各APIエンドポイントの処理関数が定義されている
	controller "go_back/go_backend/go_back/Controller"

	// cors：ブラウザのセキュリティ機能「同一オリジンポリシー」を制御するミドルウェア
	// フロントエンド（localhost:5173）とバックエンド（localhost:8080）は異なるオリジンなので
	// CORS設定をしないとブラウザがAPIリクエストをブロックしてしまう
	"github.com/gin-contrib/cors"

	// gin：GoのWebフレームワーク。ルーティングやJSONレスポンスを簡単に扱える
	"github.com/gin-gonic/gin"
)

func main() {
	// gin.Default() でルーター（どのURLにどの処理を割り当てるか管理するもの）を作成する
	// gin.Default() は標準のログ出力とパニック回復機能を自動で有効にしてくれる
	r := gin.Default()

	// CORS（Cross-Origin Resource Sharing）の設定
	// ブラウザは「異なるドメイン・ポートへのリクエスト」をデフォルトで拒否する
	// ここでフロントエンドのオリジン（localhost:5173）からのアクセスを明示的に許可する
	r.Use(cors.New(cors.Config{
		// このオリジンからのリクエストのみ許可する（フロントエンドのVite開発サーバー）
		AllowOrigins: []string{"http://localhost:5173"},
		// 許可するHTTPメソッド。OPTIONSはブラウザが事前確認（プリフライト）に使う
		AllowMethods: []string{"GET", "POST", "OPTIONS"},
		// 許可するリクエストヘッダー。JSONを送るときに Content-Type が必要
		AllowHeaders:     []string{"Content-Type"},
		AllowCredentials: false,
	}))

	// ルートグループ：/api というプレフィックスをまとめて付けられる
	// 例：api.GET("/spots") → 実際のURLは /api/spots になる
	// APIのURLを /api 以下にまとめることで、将来的にバージョン管理（/api/v2/...）などがしやすくなる
	api := r.Group("/api")
	{
		// GET /api/spots：スポット一覧を取得する
		api.GET("/spots", controller.GetSpots)

		// POST /api/stamps：スポットIDを指定してスタンプを取得する（手動）
		api.POST("/stamps", controller.PostStamp)

		// POST /api/stamps/nfc：NFCタグのUIDを使ってスタンプを取得する
		api.POST("/stamps/nfc", controller.PostStampByNfc)

		// POST /api/stamps/qr : QRコードを使ってスタンプを取得する
		api.POST("/stamps/qr", controller.PostStampByQr)

		// GET /api/stamps/:user_id：ユーザーの取得済みスタンプ一覧を返す
		// :user_id はURLパラメータ。例：/api/stamps/user123 → user_id = "user123"
		api.GET("/stamps/:user_id", controller.GetUserStamps)

		// GET /api/bingo/:user_id：ユーザーのビンゴ達成状況を返す
		api.GET("/bingo/:user_id", controller.GetBingo)
	}

	// サーバーを8080番ポートで起動する
	// r.Run() はサーバーが起動し続けるブロッキング処理なので、エラーが起きたときだけ終了する
	// log.Fatalf はエラーメッセージを出力してプログラムを終了させる
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
