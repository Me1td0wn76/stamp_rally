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
	stamp, status, errMsg := model.AcquireStamp(req.UserID, req.SpotID)

	// errMsg が空でなければ何らかのエラーが起きている（スポット不正・二重取得など）
	if errMsg != "" {
		c.JSON(status, gin.H{"error": errMsg})
		return
	}
	// 201 Created：新しいリソース（スタンプ）が作成されたことを示すステータスコード
	c.JSON(http.StatusCreated, stamp)
}

// PostStampByNfc はNFCタグのUIDを使ってスタンプを取得するハンドラー
// NFCリーダーが読み取ったUIDを受け取り、対応するスポットを特定してスタンプを付与する
func PostStampByNfc(c *gin.Context) {
	var req model.NfcStampRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// NFC UIDからスポットIDを逆引きする
	// NFCタグにはスポットIDではなくUIDが記録されているため、Spots一覧を線形探索して対応付ける
	spotID := 0 // 0 は「見つかっていない」ことを示す初期値（スポットIDは1始まりなので安全）
	for _, s := range model.Spots {
		if s.NfcUID == req.NfcUID {
			spotID = s.ID
			break // 見つかったらループを抜ける（無駄な処理をしない）
		}
	}

	// spotID が 0 のままなら、そのUIDに対応するスポットが存在しない
	if spotID == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Spot not found"})
		return
	}

	stamp, status, errMsg := model.AcquireStamp(req.UserID, spotID)
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

	// QRトークンからスポットIDを逆引きする
	// QRトークンにはスポットIDではなく、独自トークンが記録されているため、
	// Spots一覧を線形探索し、対応付ける
	spotID := 0 // 0は見つかっていないことを示す初期値
	for _, s := range model.Spots {
		if s.QrToken == req.QrToken {
			spotID = s.ID
			break // 見つかったらループを抜ける
		}
	}

	// spotIDが0のままならそのトークンに対応するスポットが存在しない
	if spotID == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Uhyoman was here..."})
		return
	}

	// スタンプ取得処理を呼び出す
	stamp, status, errMsg := model.AcquireStamp(req.UserID, spotID)
	if errMsg != "" {
		c.JSON(status, gin.H{"error": errMsg})
		return
	}

	//取得したスタンプデータをJSONとしてクライアントに返す
	c.JSON(http.StatusCreated, stamp)
}

// GetUserStamps は指定ユーザーの取得済みスタンプ一覧を返すハンドラー
func GetUserStamps(c *gin.Context) {
	// URLパラメータ（:user_id）から値を取り出す
	// 例：/api/stamps/user123 へのリクエストなら userID = "user123"
	userID := c.Param("user_id")

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
func GetBingo(c *gin.Context) {
	userID := c.Param("user_id")

	model.Mu.Lock()
	defer model.Mu.Unlock()

	// 取得済みスポットIDを Set（重複なし集合）として管理する
	// map[int]bool を使うことで「あるIDがスタンプ済みか」をO(1)で高速に判定できる
	stampedSet := make(map[int]bool)
	for _, s := range model.Stamps[userID] {
		stampedSet[s.SpotID] = true
	}

	// map のキー一覧（取得済みスポットID）をスライスに変換する
	// map はキーの順序が不定なので、毎回異なる順序になることがあるが、今回は問題なし
	stampedIDs := make([]int, 0, len(stampedSet))
	for id := range stampedSet {
		stampedIDs = append(stampedIDs, id)
	}

	// ビンゴライン判定：定義された全ラインをチェックして達成済みのものを集める
	completedLines := [][]int{}
	for _, line := range model.BingoLines {
		bingo := true
		for _, id := range line {
			// ライン内のスポットIDが1つでもスタンプ済みでなければビンゴではない
			if !stampedSet[id] {
				bingo = false
				break
			}
		}
		if bingo {
			completedLines = append(completedLines, line)
		}
	}

	// 結果をまとめてJSONで返す
	// IsComplete は「取得済みスポット数 == 全スポット数」で全制覇を判定する
	c.JSON(http.StatusOK, model.BingoResult{
		StampedIDs: stampedIDs,
		BingoCount: len(completedLines),
		BingoLines: completedLines,
		IsComplete: len(stampedSet) == len(model.Spots),
	})
}
