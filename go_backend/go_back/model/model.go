package model

import (
	"net/http"
	"sync"
	"time"
)

// ----------------------------------------------------------------
// 構造体（struct）定義
// Goでは struct を使ってデータの型を定義する。
// json:"..." タグは JSON のキー名を指定する（APIレスポンスに使われる）。
// ----------------------------------------------------------------

type Spot struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"` // "food","activity","codeflow"の3種類
	QrToken     string `json:"-"`    // QRコードに埋め込む一意の文字列(フロントエンドには返さないので json:"-" で非公開)
}

type Stamp struct {
	UserID    string    `json:"user_id"`
	SpotID    int       `json:"spot_id"`
	StampedAt time.Time `json:"stamped_at"` // time.Time はGoの日時型
}

// StampRequest は手動スタンプ取得のリクエストボディ
// binding:"required" は Gin のバリデーション機能で、
// フィールドが空の場合に自動的にエラーを返す
type StampRequest struct {
	UserID string `json:"user_id" binding:"required"`
	SpotID int    `json:"spot_id" binding:"required"`
}

// NfcStampRequest はNFCタグ読み取りによるスタンプ取得のリクエストボディ
type NfcStampRequest struct {
	UserID string `json:"user_id" binding:"required"`
	NfcUID string `json:"nfc_uid" binding:"required"`
}

// QrStampRequest はQRタグ読み取りによるスタンプ取得のリクエストボディ
type QrStampRequest struct {
	UserID  string `json:"user_id" binding:"required"`
	QrToken string `json:"qr_token" binding:"required"`
}

// BingoResult はビンゴ状況のレスポンス
type BingoResult struct {
	StampedIDs []int   `json:"stamped_ids"` // 取得済みスポットIDの一覧
	BingoCount int     `json:"bingo_count"` // 達成済みビンゴライン数
	BingoLines [][]int `json:"bingo_lines"` // 達成済みラインのスポットID一覧
	IsComplete bool    `json:"is_complete"` // 全スポット制覇フラグ
}

// ----------------------------------------------------------------
// ビンゴライン定義
// 3x3 グリッドの spot_id 配置イメージ:
//
//	[1][2][3]
//	[4][5][6]
//	[7][8][9]
//
// 横3・縦3・斜め2 = 計8ライン
// ----------------------------------------------------------------
var BingoLines = [][]int{
	{1, 2, 3}, {4, 5, 6}, {7, 8, 9}, // 横
	{1, 4, 7}, {2, 5, 8}, {3, 6, 9}, // 縦
	{1, 5, 9}, {3, 5, 7}, // 斜め
}

// ----------------------------------------------------------------
// インメモリデータストア
// DBを使わず、サーバーのメモリ上にデータを保持する。
// サーバーを再起動するとデータはリセットされる。
//
// sync.Mutex（ミューテックス）は複数のリクエストが同時にデータを
// 読み書きしてもデータが壊れないようにするための排他制御。
// Goはgoroutineで並行処理するため、共有データには必須。
// ----------------------------------------------------------------
var (
	Mu    sync.Mutex
	Spots = []Spot{
		{ID: 1, Name: "東京タワー", Description: "東京の象徴的な電波塔", Type: "food", QrToken: "tokyotower"},
		{ID: 2, Name: "浅草寺", Description: "東京最古の寺院", Type: "activity", QrToken: "asakusa"},
		{ID: 3, Name: "渋谷スクランブル交差点", Description: "世界有数の混雑交差点", Type: "codeflow", QrToken: "shibuya"},
	}
	// map[string][]Stamp は「ユーザーIDをキー、スタンプ一覧を値」とするマップ
	Stamps = make(map[string][]Stamp)
)

// Business logic
func AcquireStamp(userID string, spotID int) (*Stamp, int, string) {
	validSpot := false
	for _, spot := range Spots {
		if spot.ID == spotID {
			validSpot = true
			break
		}
	}
	if !validSpot {
		return nil, http.StatusBadRequest, "spot not found"
	}

	Mu.Lock()
	defer Mu.Unlock()

	for _, s := range Stamps[userID] {
		if s.SpotID == spotID {
			return nil, http.StatusConflict, "stamp already acquired"
		}
	}

	stamp := Stamp{
		UserID:    userID,
		SpotID:    spotID,
		StampedAt: time.Now(),
	}
	Stamps[userID] = append(Stamps[userID], stamp)
	return &stamp, http.StatusCreated, ""
}

//----------------------------------------------------------------
// Spot関連
//----------------------------------------------------------------

// GetSpotByNfcUID は NFC UID から SpotID を取得する関数
// Nfcタグと対応したスポットがあるかの判定もここで行う
func GetSpotIDByNfcUID(nfcUID string) (int, bool) {
	spotID, exists := NfcToSpotMap[nfcUID]
	if !exists {
		return 0, false
	}
	return spotID, exists
}

// GetSpotByID は SpotID から Type を取得する関数
func GetTypeBySpotID(spotID int) string {
	for _, spot := range Spots {
		if spot.ID == spotID {
			return spot.Type
		}
	}
	return ""
}

// GetSpotIDByQrToken は QrToken から SpotID を取得する関数
func GetSpotIDByQrToken(qrToken string) (int, bool) {
	for _, spot := range Spots {
		if spot.QrToken == qrToken {
			return spot.ID, true
		}
	}
	return 0, false
}

// GetTypeByQrToken は QrToken から Type を取得する関数
func GetTypeByQrToken(qrToken string) string {
	for _, spot := range Spots {
		if spot.QrToken == qrToken {
			return spot.Type
		}
	}
	return ""
}
