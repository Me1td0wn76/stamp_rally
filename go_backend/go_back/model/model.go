package model

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
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
	QrToken string   `json:"-"`    // QRコード・NFCタグのURL(?spot=<トークン>)に埋め込む一意の文字列。推測されないようランダムな文字列にする(フロントエンドには返さないので json:"-" で非公開)。スタッフ別トークン(staff.go)を使うスポットは空にする
}

type Stamp struct {
	UserID    string    `json:"-"` // ユーザーIDは HttpOnly Cookie でのみ扱い、レスポンスには含めない
	SpotID    int       `json:"spot_id"`
	Staff     string    `json:"-"`          // スタンプを押したスタッフ(スタッフ別トークンで取ったときだけ入る。確認は管理用 API で行うので、ユーザーには返さない)
	StampedAt time.Time `json:"stamped_at"` // time.Time はGoの日時型
	CellIndex int       `json:"cell_index"` // このスタンプで埋まったビンゴのマス番号(空きがなければ-1)
}

// StampSource は、読み取ったトークン・UID から分かる「どのスポットで・誰が」押したスタンプか
type StampSource struct {
	SpotID int
	Staff  string // スタッフ別トークン(staff.go)のときだけ入る。それ以外は空
}

// StampRequest は手動スタンプ取得のリクエストボディ
// binding:"required" は Gin のバリデーション機能で、
// フィールドが空の場合に自動的にエラーを返す
// ユーザーIDはボディではなく Cookie で受け取る
type StampRequest struct {
	SpotID int `json:"spot_id" binding:"required"`
}

// NfcStampRequest はNFCタグ読み取りによるスタンプ取得のリクエストボディ
type NfcStampRequest struct {
	NfcUID string `json:"nfc_uid" binding:"required"`
}

// QrStampRequest はQRコード読み取りによるスタンプ取得のリクエストボディ
type QrStampRequest struct {
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
		// コードフローは誰が押したかを記録するため、スポット共通のトークンは持たず、スタッフ別トークン(staff.go)だけで取る
		{ID: 1, Name: "コードフロー", Description: "402・コードフロー", Type: "codeflow"},
		{ID: 2, Name: "焼きそば屋", Description: "テラス・R4A", Type: "food", QrToken: "fdsjX4-YBuwr-skFW-S6yw"},
		{ID: 3, Name: "Francfranc ～細田、焼いてます～", Description: "R4B・501.2", Type: "food", QrToken: "rCEmVG1XMrID4hsn_GtTQg"},
		{ID: 4, Name: "ダーツベイダー2", Description: "R3A・301", Type: "activity", QrToken: "4vRhgi7472sSF2XaPM54pw"},
		{ID: 5, Name: "玉田のカリカリ大作戦！", Description: "R3B・303", Type: "food", QrToken: "AP_yrQaLY9PktV6fOYKWYw"},
		{ID: 6, Name: "(仮)アン・ボール", Description: "R2A・302", Type: "activity", QrToken: "Ag2ClMibWLo6_NMW8WWQ6A"},
		{ID: 7, Name: "野木の甘ーいチュロス", Description: "R2B・501.2", Type: "food", QrToken: "7W4tCa5_zRbdeWwMyFIAww"},
		{ID: 8, Name: "単位BET", Description: "R1A・304", Type: "activity", QrToken: "MlhywvmX3nxnY7s8m6m2QQ"},
		{ID: 9, Name: "スリランカ人ポテト", Description: "R1B・303", Type: "food", QrToken: "2hz4pd9sSyss1VsmkxrcPg"},
		{ID: 10, Name: "スープ$カフェ", Description: "S3・505", Type: "food", QrToken: "FUF96BOCZdnNDOXG-mRGGQ"},
		{ID: 11, Name: "久ちゃん綿あめショップ", Description: "S2・501.2", Type: "food", QrToken: "UXDGWgbxxHapnHN3W8QYRQ"},
		{ID: 12, Name: "(仮)射的", Description: "S1・504", Type: "activity", QrToken: "Q40tOe3iw4i0_HJ4lC5NCQ"},
		{ID: 13, Name: "大乱闘気配りブラザーズ", Description: "J2・602", Type: "activity", QrToken: "D1FLzyudewVM4mpsgZ_ZOQ"},
		{ID: 14, Name: "岩田屋", Description: "J1・403前", Type: "food", QrToken: "2_itjHiBLUOb6QG59imk-A"},
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
// src.Staff(スタッフ別トークンで取ったときだけ入る)はスタンプに記録する
func AcquireStamp(userID string, src StampSource) (*Stamp, int, string) {
	spot, ok := GetSpotByID(src.SpotID)
	if !ok {
		return nil, http.StatusBadRequest, "spot not found"
	}

	Mu.Lock()
	defer Mu.Unlock()

	for _, s := range Stamps[userID] {
		if s.SpotID == src.SpotID {
			return nil, http.StatusConflict, "stamp already acquired"
		}
	}

	cellIndex, err := pickBingoCell(userID, spot.Type)
	if err != nil {
		return nil, http.StatusInternalServerError, "failed to pick bingo cell"
	}

	stamp := Stamp{
		UserID:    userID,
		SpotID:    src.SpotID,
		Staff:     src.Staff,
		StampedAt: time.Now(),
		CellIndex: cellIndex,
	}
	Stamps[userID] = append(Stamps[userID], stamp)

	// スタッフ別トークンで取ったスタンプはサーバーログにも残す
	// (メモリ上の記録はサーバーを再起動すると消えるが、ログは残る)
	if src.Staff != "" {
		log.Printf("staff stamp: spot=%d(%s) staff=%q", spot.ID, spot.Name, src.Staff)
	}
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

// qrSources・nfcSources は、トークン・UID から「どのスポットで・誰が」押したスタンプかを引く表
// Spots の QrToken・nfcToSpotMap(map.go)・staffTokens(staff.go)をまとめたもので、起動時に validate.go が作る
var (
	qrSources  map[string]StampSource // QR トークン → スタンプの出どころ
	nfcSources map[string]StampSource // 正規化した NFC UID → スタンプの出どころ
)

// ResolveNfcUID は NFC UID から、どのスポットで・誰が押したスタンプかを取得する関数
// Nfcタグと対応したスポットがあるかの判定もここで行う
// 存在しないキーを引いたときのゼロ値は (StampSource{}, false) なので、そのまま返してよい
func ResolveNfcUID(nfcUID string) (StampSource, bool) {
	src, ok := nfcSources[normalizeNfcUID(nfcUID)]
	return src, ok
}

// ResolveQrToken は QrToken から、どのスポットで・誰が押したスタンプかを取得する関数
func ResolveQrToken(qrToken string) (StampSource, bool) {
	src, ok := qrSources[qrToken]
	return src, ok
}
