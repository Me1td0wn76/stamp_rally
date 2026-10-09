package controller

import (
	"go_back/go_backend/go_back/model"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetSpots はスポット一覧を返すハンドラー
// ハンドラーとは「特定のURLにアクセスされたときに実行される関数」のこと
// *gin.Context はリクエスト情報（送られてきたデータ）とレスポンス（返すデータ）を持つ構造体
func GetSpots(c *gin.Context) {
	// c.JSON でHTTPステータスコードとJSONデータをクライアントに返す
	// http.StatusOK は 200 番（成功）を意味する定数
	c.JSON(http.StatusOK, model.Spots)
}

// PostUser はユーザーIDを発行して Cookie に保存するハンドラー
// フロントエンドのスタートボタン押下時に呼ばれる
// IDはレスポンスボディには含めず、HttpOnly Cookie でのみ渡す
func PostUser(c *gin.Context) {
	// すでに Cookie があればそのIDを使い続ける(スタートを何度押しても進捗が消えないように)
	userID, err := c.Cookie(userCookieName)
	if err != nil || userID == "" {
		userID, err = model.CreateUser()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			return
		}
	}
	// 有効期限を延長するため、既存IDの場合も書き直す
	setUserCookie(c, userID)
	c.Status(http.StatusNoContent)
}

// PostStamp は手動でスタンプを取得するハンドラー
// クライアントから「どのユーザーが・どのスポットで」スタンプを押したか受け取る
func PostStamp(c *gin.Context) {
	// リクエストボディ（クライアントから送られてきたJSON）を受け取る変数を用意する
	var req model.StampRequest

	// ShouldBindJSON でリクエストのJSONを req 変数に変換（デシリアライズ）する
	// binding:"required" タグが付いたフィールドが空だと自動的にエラーになる
	// エラーがあれば 400 Bad Request をクライアントに返して処理を終了する
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ビジネスロジック（スタンプ取得処理）はmodelに任せる
	// コントローラーはリクエストとレスポンスの変換だけを担当するのがGoの一般的な設計
	stamp, status, errMsg := model.AcquireStamp(userIDFrom(c), req.SpotID)

	// errMsg が空でなければ何らかのエラーが起きている（スポット不正・二重取得など）
	if errMsg != "" {
		c.JSON(status, gin.H{"error": errMsg})
		return
	}
	// 201 Created：新しいリソース（スタンプ）が作成されたことを示すステータスコード
	c.JSON(http.StatusCreated, stamp)
}

// PostStampByNfcはNFCタグのUIDを使ってスタンプを取得するハンドラー
// NFCリーダーが読み取ったUIDを受け取り、対応するスポットを特定してスタンプを付与する
func PostStampByNfc(c *gin.Context) {
	var req model.NfcStampRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// NfcUIDからSpotIDを特定
	// (UIDの大文字小文字・区切り文字の違いはmodel側で吸収)
	// Spotの存在確認は、AcquireStampに任せる
	spotID, exists := model.GetSpotIDByNfcUID(req.NfcUID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Unknown NFC Tag"})
		return
	}

	// スタンプ取得処理
	stamp, status, errMsg := model.AcquireStamp(userIDFrom(c), spotID)
	if errMsg != "" {
		c.JSON(status, gin.H{"error": errMsg})
		return
	}
	c.JSON(http.StatusCreated, stamp)
}

// PostStampByQr はQRコードの読み取りトークンを使ってスタンプを取得するハンドラー
// QRコードリーダーが読み取ったトークンを受け取り、対応するスポットを特定してスタンプを付与
func PostStampByQr(c *gin.Context) {
	var req model.QrStampRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// QRトークンからSpotIDを取得
	spotID, exsits := model.GetSpotIDByQrToken(req.QrToken)
	if !exsits {
		c.JSON(http.StatusNotFound, gin.H{"error": "Unknouwn QR Code"})
		return
	}

	// スタンプ取得処理
	stamp, status, errMsg := model.AcquireStamp(userIDFrom(c), spotID)
	if errMsg != "" {
		c.JSON(status, gin.H{"error": errMsg})
		return
	}
	c.JSON(http.StatusCreated, stamp)
}

// GetUserStamps は指定ユーザーの取得済みスタンプ一覧を返すハンドラー
func GetUserStamps(c *gin.Context) {
	// RequireUser ミドルウェアが Cookie から取り出したユーザーIDを使う
	userID := userIDFrom(c)

	// 共有データ（Stamps マップ）を読む前にロックする
	// ロックしないと、別のリクエストが同時に書き込んでいるときにデータが壊れる可能性がある
	model.Mu.Lock()
	// defer はこの関数が終了するときに実行される。ロックの解放を確実に行うためのGoのイディオム
	defer model.Mu.Unlock()

	userStamps := model.Stamps[userID]
	// マップに存在しないキーを参照すると nil が返る
	// nil をそのまま返すと JSON が null になるため、空のスライスに変換して [] を返す
	if userStamps == nil {
		userStamps = []model.Stamp{}
	}
	c.JSON(http.StatusOK, userStamps)
}

// GetBingo は指定ユーザーのビンゴ達成状況を返すハンドラー
// 盤面の生成・判定は Typeベースで model側(bingo.go)が行う(ロックもmodel側で取る)
func GetBingo(c *gin.Context) {
	c.JSON(http.StatusOK, model.GetBingoResult(userIDFrom(c)))
}
