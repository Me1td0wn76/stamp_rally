package model

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ----------------------------------------------------------------
// 構造体（struct）定義
// Goでは struct を使ってデータの型を定義する。
// json:"..." タグは JSON のキー名を指定する（APIレスポンスに使われる）。
// ----------------------------------------------------------------

// SpotTypeはスポットの種別
// 独自の型にしておくことで、打ち間違いを定数を使う限りコンパイル時に防げる。
type SpotType string

const (
	SpotTypeFood     SpotType = "food"
	SpotTypeActivity SpotType = "activity"
	SpotTypeCodeflow SpotType = "codeflow"
)

func (t SpotType) IsValid() bool {
	switch t {
	case SpotTypeFood, SpotTypeActivity, SpotTypeCodeflow:
		return true
	}
	return false
}

type Spot struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Type        SpotType `json:"type"` // stringベースなため、JSONでは文字列になる
	QrToken     string   `json:"-"`    // QRコードに埋め込む一意の文字列(フロントエンドには返さないので json:"-" で非公開)
}

type Stamp struct {
	UserID    string    `json:"-"` // ユーザーIDは HttpOnly Cookie でのみ扱い、レスポンスには含めない
	SpotID    int       `json:"spot_id"`
	StampedAt time.Time `json:"stamped_at"` // time.Time はGoの日時型
	CellIndex int       `json:"cell_index"` // このスタンプで埋まったビンゴのマス番号(空きがなければ-1)
}

// StampRequest は手動スタンプ取得のリクエストボディ
// binding:"required" は Gin のバリデーション機能で、
// フィールドが空の場合に自動的にエラーを返す
// ユーザーIDはボディではなく Cookie で受け取る
type StampRequest struct {
	UserID string `json:"user_id" binding:"required"`
	SpotID int    `json:"spot_id" binding:"required"`
}

// NfcStampRequest はNFCタグ読み取りによるスタンプ取得のリクエストボディ
type NfcStampRequest struct {
	UserID string `json:"user_id" binding:"required"`
	NfcUID string `json:"nfc_uid" binding:"required"`
}

// QrStampRequest はQRコード読み取りによるスタンプ取得のリクエストボディ
type QrStampRequest struct {
	UserID  string `json:"user_id" binding:"required"`
	QrToken string `json:"qr_token" binding:"required"`
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
		{ID: 1, Name: "コードフロー", Description: "402・コードフロー", Type: "codeflow", QrToken: "bulbasaur"},
		{ID: 2, Name: "焼きそば屋", Description: "テラス・R4A", Type: "food", QrToken: "ivy"},
		{ID: 3, Name: "Francfranc ～細田、焼いてます～", Description: "R4B・501.2", Type: "food", QrToken: "venusaur"},
		{ID: 4, Name: "ダーツベイダー2", Description: "R3A・301", Type: "activity", QrToken: "charmander"},
		{ID: 5, Name: "玉田のカリカリ大作戦！", Description: "R3B・303", Type: "food", QrToken: "lizard"},
		{ID: 6, Name: "(仮)アン・ボール", Description: "R2A・302", Type: "activity", QrToken: "charizard"},
		{ID: 7, Name: "野木の甘ーいチュロス", Description: "R2B・501.2", Type: "food", QrToken: "squirtle"},
		{ID: 8, Name: "単位BET", Description: "R1A・304", Type: "activity", QrToken: "kameer"},
		{ID: 9, Name: "スリランカ人ポテト", Description: "R1B・303", Type: "food", QrToken: "blastoise"},
		{ID: 10, Name: "スープ$カフェ", Description: "S3・505", Type: "food", QrToken: "caterpie"},
		{ID: 11, Name: "久ちゃん綿あめショップ", Description: "S2・501.2", Type: "food", QrToken: "metapod"},
		{ID: 12, Name: "(仮)射的", Description: "S1・504", Type: "activity", QrToken: "butterfree"},
		{ID: 13, Name: "大乱闘気配りブラザーズ", Description: "J2・602", Type: "activity", QrToken: "beedle"},
		{ID: 14, Name: "岩田屋", Description: "J1・403前", Type: "food", QrToken: "cocoon"},
	}
	// map[string][]Stamp は「ユーザーIDをキー、スタンプ一覧を値」とするマップ
	Stamps = make(map[string][]Stamp)
	// map[string]time.Time は「ユーザーIDをキー、発行日時を値」とするマップ
	// Mu ではなく usersMu で保護する
	Users = make(map[string]time.Time)

	// usersMu は Users 専用のロック
	// Mu と分けることで、ユーザー発行(認証不要の POST /api/users)がスタンプの読み書きを待たせないようにする
	// UserExists は全リクエストで呼ばれ読み取りが大半なので、複数の読み取りを同時に行える RWMutex にする
	usersMu sync.RWMutex
)

// ----------------------------------------------------------------
// User関連
// ----------------------------------------------------------------

// userIDBytes はユーザーIDの元になるランダムバイト数(hex化すると32文字になる)
const userIDBytes = 16

// defaultMaxUsers は MAX_USERS が未設定・不正なときのユーザー数の上限
const defaultMaxUsers = 10000

// maxUsers は発行できるユーザーIDの上限
// POST /api/users は認証不要なので、乱発されても Users(とそのスタンプ)のメモリが際限なく増えないように頭打ちにする
// 1ユーザーのスタンプはスポット数(14個)までなので、Users を抑えれば Stamps も抑えられる
var maxUsers = loadMaxUsers()

// loadMaxUsers は環境変数 MAX_USERS から上限を読み込む
func loadMaxUsers() int {
	n, err := strconv.Atoi(os.Getenv("MAX_USERS"))
	if err != nil || n <= 0 {
		return defaultMaxUsers
	}
	return n
}

// ErrTooManyUsers はユーザー数が上限に達したときのエラー
var ErrTooManyUsers = errors.New("user limit reached")

// CreateUser は新しいユーザーIDを発行して登録する
// crypto/rand を使うことで、推測されにくいIDになる
// 上限に達している場合は ErrTooManyUsers を返す
func CreateUser() (string, error) {
	usersMu.Lock()
	defer usersMu.Unlock()

	if len(Users) >= maxUsers {
		return "", ErrTooManyUsers
	}

	for {
		b := make([]byte, userIDBytes)
		if _, err := rand.Read(b); err != nil {
			return "", err
		}
		userID := hex.EncodeToString(b)
		// 万が一既存IDと衝突した場合は作り直す
		if _, exists := Users[userID]; exists {
			continue
		}
		Users[userID] = time.Now()
		return userID, nil
	}
}

// UserExists は CreateUser で発行済みのユーザーIDかどうかを返す
// Cookie の値はクライアントが自由に書き換えられるため、登録済みかを必ずサーバー側で確認する
// (サーバー再起動でメモリが消えた後の古いIDもここで弾かれる)
func UserExists(userID string) bool {
	usersMu.RLock()
	defer usersMu.RUnlock()

	_, exists := Users[userID]
	return exists
}

// Business logic
func AcquireStamp(userID string, spotID int) (*Stamp, int, string) {
	spot, ok := GetSpotByID(spotID)
	if !ok {
		return nil, http.StatusBadRequest, "spot not found"
	}

	Mu.Lock()
	defer Mu.Unlock()

	for _, s := range Stamps[userID] {
		if s.SpotID == spotID {
			return nil, http.StatusConflict, "stamp already acquired"
		}
	}

	cellIndex, err := pickBingoCell(userID, spot.Type)
	if err != nil {
		return nil, http.StatusInternalServerError, "failed to pick bingo cell"
	}

	stamp := Stamp{
		UserID:    userID,
		SpotID:    spotID,
		StampedAt: time.Now(),
		CellIndex: cellIndex,
	}
	Stamps[userID] = append(Stamps[userID], stamp)
	return &stamp, http.StatusCreated, ""
}

// ----------------------------------------------------------------
// Spot関連
// ----------------------------------------------------------------

// GetSpotByID は SpotID から Spot を取得する関数
// Spots の ID検索はここに一本化する
// (コピーを返すことで、Spotsには影響しない)
func GetSpotByID(id int) (*Spot, bool) {
	for _, spot := range Spots {
		if spot.ID == id {
			s := spot
			return &s, true
		}
	}
	return nil, false
}

// nfcUIDReplacer は UID の区切り文字を取り除く
var nfcUIDReplacer = strings.NewReplacer(":", "", "-", "", " ", "")

// normalizeNfcUID は UID を比較用の形式にそろえる
// "04:ab:cd:ef:01" / "04-AB-CD-EF-01" / "04ABCDEF01" はすべて "04ABCDEF01" になる
func normalizeNfcUID(uid string) string {
	return strings.ToUpper(nfcUIDReplacer.Replace(uid))
}

// GetSpotIDByNfcUID は NFC UID から SpotID を取得する関数
// Nfcタグと対応したスポットがあるかの判定もここで行う
// 存在しないキーを引いたときのゼロ値は (0, false) なので、そのまま返してよい
func GetSpotIDByNfcUID(nfcUID string) (int, bool) {
	spotID, ok := nfcToSpotMap[normalizeNfcUID(nfcUID)]
	return spotID, ok
}

// GetSpotIDByQrToken は QrToken から SpotID を取得する関数
// [feature]SpotからQRTokenを削除し、NfcUIDと同じマッピングにした際、使用する
func GetSpotIDByQrToken(qrToken string) (int, bool) {
	for _, spot := range Spots {
		if spot.QrToken == qrToken {
			return spot.ID, true
		}
	}
	return 0, false
}
