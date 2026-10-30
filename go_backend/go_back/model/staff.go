package model

import (
	"sort"
	"time"
)

// スタッフ別トークン
//
// ここにトークンを登録したスポット(今は CodeFlow だけ)は、スポット共通のトークン(Spot.QrToken)・NFC UID を持たず、
// スタンプを押す(QRコード・NFCタグを出す)スタッフごとに別のトークンを使う。
// URL の形はほかのスポットと同じ https://<ドメイン>/?spot=<トークン> なので、フロントエンドの変更はいらない。
// どのスタッフのトークンで取ったかはスタンプに記録され、管理用 API(GET /api/admin/staff-stamps)とサーバーログで確認できる。
//
//   - 非公開(小文字始まり)にしてあり、読み取りは ResolveQrToken / ResolveNfcUID 経由のみ。
//   - 起動時に validate.go がトークンの長さ・重複、SpotID の存在、スタッフ名の重複などをチェックする。
//   - トークンを変えると、そのスタッフのタグ・QR は書き直しになる(書き込み・印刷の前に確定させる)。
//     スタッフ名は管理用 API・ログに出るだけなので、あとから変えてもよい。
//   - StampImage を登録すると、そのスタッフが押したマスにはかぼちゃの代わりにその画像が出る(GET /api/bingo の stamp_image)。
//     画像は stamp_rally_front/public/stamps/ に置く。ユーザーに返すのはファイル名だけで、スタッフ名は返さない。
//   - Secret を登録すると、そのスタッフのスタンプを取ったときだけスタンプ取得 API の応答に secret が付き、画面に隠し画面が出る(secretFor)。
//     スタッフ名を返すのはこの secret の中だけ。
type staffToken struct {
	SpotID     int    // スタンプを押すスポット
	Staff      string // スタッフの名前(スポットの中で重複不可)
	QrToken    string // このスタッフの QRコード・NFCタグの URL(?spot=<トークン>)に入れるトークン
	NfcUID     string // このスタッフの NFC タグの UID(アプリの NFC 読み込み画面用。未登録なら空)
	StampImage string // このスタッフが押したマスに出す画像(public/stamps/ のファイル名。空ならほかのマスと同じかぼちゃ)
	Secret     string // このスタッフのスタンプを取ったときに開く隠し画面(SecretSpecialRoom)。空なら何もない
}

// SecretSpecialRoom は特別室(隠し画面)の名前。staffToken.Secret と、スタンプ取得 API の secret.room に入る
const SecretSpecialRoom = "special-room"

var staffTokens = []staffToken{
	{SpotID: 1, Staff: "Me1td0wn76", QrToken: "zFQCO4BjiSJCz1dt0Dw9Rw", StampImage: "Me1td0wn76_stamp.png", Secret: SecretSpecialRoom},
	{SpotID: 1, Staff: "Tongari-Boy", QrToken: "fUAtG4HeJkFkUyz7LUJqdw", StampImage: "UCI_stamp.png"},
	{SpotID: 1, Staff: "Sabigon-MA", QrToken: "qYXSsfLX8eBK67ey6gisiw", StampImage: "Sabigon-MA_stamp.png"},
	{SpotID: 1, Staff: "syun17", QrToken: "Z84lmOpeGpBJjoB8a2w9cw", StampImage: "staff1.svg"},
	{SpotID: 1, Staff: "shouras", QrToken: "JMB7aE6ykdbRPz6xrZk5zQ", StampImage: "shouras.png"},
	{SpotID: 1, Staff: "niseeri-to", QrToken: "lENT24saioMFWwCCojdcpw", StampImage: "staff1.svg"},
	{SpotID: 1, Staff: "Orica256", QrToken: "F4xMfrbpK6if6LrNm-dM1w", StampImage: "staff1.svg"},
	{SpotID: 1, Staff: "Gozaru", QrToken: "l32VnNrycxaxILraXWQVgD", StampImage: "gozaru.png"},
	{SpotID: 1, Staff: "Okada", QrToken: "HFXVtk_MntsauVeP5AIFMg", StampImage: "okada.jpg"},
}

// stampImageOf は、取ったマスに出すスタンプ画像のファイル名を返す
// 1. スタッフ別トークンで取ったスタンプで、そのスタッフの画像が登録されていれば、その画像
// 2. そうでなければ、スポットの画像(Spot.StampImage)。どのスポットで取ったかが画像でわかる
// どちらも未登録のときは空(フロントエンドはかぼちゃを出す)
func stampImageOf(src StampSource) string {
	if src.Staff != "" {
		for _, st := range staffTokens {
			if st.SpotID == src.SpotID && st.Staff == src.Staff && st.StampImage != "" {
				return st.StampImage
			}
		}
	}
	if spot, ok := GetSpotByID(src.SpotID); ok {
		return spot.StampImage
	}
	return ""
}

// Secret は、隠し画面を開くスタッフ(staffToken.Secret のあるスタッフ)のスタンプを取ったときだけ、
// スタンプ取得 API(QR・NFC)の 201 の応答に足す中身
type Secret struct {
	Room       string `json:"room"`        // 開く隠し画面("special-room")
	No         int    `json:"no"`          // 入室番号(その隠し画面を開くスタンプを初めて取った順の通し番号)
	Staff      string `json:"staff"`       // 押したスタッフ
	StampImage string `json:"stamp_image"` // そのスタッフのスタンプ画像(public/stamps/ のファイル名)
	Stamps     int    `json:"stamps"`      // 取ったあとの、そのユーザーのスタンプの数
}

// secretRoomNos は隠し画面ごとの入室番号(隠し画面 → ユーザーID → 番号)。Mu で保護する
// スタンプと同じくメモリに置くだけなので、サーバーを再起動すると数え直しになる
var secretRoomNos = make(map[string]map[string]int)

// secretStaffOf は、src が隠し画面を開くスタッフ(Secret のあるスタッフ)のスタンプなら、そのスタッフを返す
func secretStaffOf(src StampSource) (staffToken, bool) {
	if src.Staff == "" {
		return staffToken{}, false
	}
	for _, st := range staffTokens {
		if st.SpotID == src.SpotID && st.Staff == src.Staff && st.Secret != "" {
			return st, true
		}
	}
	return staffToken{}, false
}

// isSpecialStamp は、隠し画面を開くスタッフのスタンプかを返す
// ビンゴのマス・図鑑の special に入れる(画面ではキラキラを付ける。スタッフ名は返さない)
func isSpecialStamp(src StampSource) bool {
	_, ok := secretStaffOf(src)
	return ok
}

// secretFor は、src が隠し画面を開くスタッフのスタンプなら、応答に足す Secret を返す(それ以外は nil)
// 入室番号は、その隠し画面を開くスタンプを初めて取ったときに振り、同じユーザーにはいつも同じ番号を返す
// スタンプの記録と同じロックの中で数えるため、Mu を持ったまま呼ぶこと
func secretFor(userID string, src StampSource) *Secret {
	st, ok := secretStaffOf(src)
	if !ok {
		return nil
	}
	nos := secretRoomNos[st.Secret]
	if nos == nil {
		nos = make(map[string]int)
		secretRoomNos[st.Secret] = nos
	}
	no, entered := nos[userID]
	if !entered {
		no = len(nos) + 1
		nos[userID] = no
	}
	return &Secret{Room: st.Secret, No: no, Staff: st.Staff, StampImage: st.StampImage, Stamps: len(Stamps[userID])}
}

// heldSecret は、userID が room のカギ(その隠し画面を開くスタッフのスタンプ)を持っていれば、その Secret を返す(なければ nil)
// 入室番号は、カギを取ったときに振った番号のまま。Mu を持ったまま呼ぶこと
func heldSecret(userID, room string) *Secret {
	for _, s := range Stamps[userID] {
		src := StampSource{SpotID: s.SpotID, Staff: s.Staff}
		if st, ok := secretStaffOf(src); ok && st.Secret == room {
			return secretFor(userID, src)
		}
	}
	return nil
}

// GetHeldSecret は、userID が room のカギを持っていれば、その Secret を返す(GET /api/special-room)
// 特別室に入った記録が端末に残っていないとき(保存できなかった・消えた)に、画面が取り直すのに使う
func GetHeldSecret(userID, room string) (*Secret, bool) {
	Mu.Lock()
	defer Mu.Unlock()

	secret := heldSecret(userID, room)
	return secret, secret != nil
}

// StaffStampCount はスタッフごとのスタンプ数
type StaffStampCount struct {
	SpotID     int    `json:"spot_id"`
	Staff      string `json:"staff"`
	StampImage string `json:"stamp_image,omitempty"` // スタッフのスタンプ画像(管理画面のランキングに出す)
	Count      int    `json:"count"`
}

// StaffStampRecord は、スタッフ別トークンを使うスポットで押されたスタンプ1回分の記録
// ユーザーIDは Cookie の値そのもので、知られるとなりすませるため含めない
type StaffStampRecord struct {
	SpotID    int       `json:"spot_id"`
	Staff     string    `json:"staff"`
	StampedAt time.Time `json:"stamped_at"`
}

// StaffStampReport は管理用 API(GET /api/admin/staff-stamps)のレスポンス
type StaffStampReport struct {
	Counts []StaffStampCount  `json:"counts"` // スタッフごとのスタンプ数(staffTokens の順。まだ 0 のスタッフも含む)
	Stamps []StaffStampRecord `json:"stamps"` // スタンプの記録(新しい順)
}

// GetStaffStampReport は、スタッフ別トークンを使うスポットで押されたスタンプを集計する
// 手動 API(POST /api/stamps)で取ったスタンプはスタッフがわからないので、staff が空の行で数える
func GetStaffStampReport() StaffStampReport {
	staffSpots := make(map[int]bool)
	counts := make([]StaffStampCount, 0, len(staffTokens))
	countIndex := make(map[StampSource]int, len(staffTokens)) // {SpotID, Staff} → counts の位置
	for _, st := range staffTokens {
		staffSpots[st.SpotID] = true
		countIndex[StampSource{SpotID: st.SpotID, Staff: st.Staff}] = len(counts)
		counts = append(counts, StaffStampCount{SpotID: st.SpotID, Staff: st.Staff, StampImage: st.StampImage})
	}

	Mu.Lock()
	defer Mu.Unlock()

	stamps := []StaffStampRecord{}
	for _, userStamps := range Stamps {
		for _, s := range userStamps {
			if !staffSpots[s.SpotID] {
				continue
			}
			key := StampSource{SpotID: s.SpotID, Staff: s.Staff}
			i, ok := countIndex[key]
			if !ok {
				i = len(counts)
				countIndex[key] = i
				counts = append(counts, StaffStampCount{SpotID: s.SpotID, Staff: s.Staff})
			}
			counts[i].Count++
			stamps = append(stamps, StaffStampRecord{SpotID: s.SpotID, Staff: s.Staff, StampedAt: s.StampedAt})
		}
	}
	sort.Slice(stamps, func(i, j int) bool { return stamps[i].StampedAt.After(stamps[j].StampedAt) })
	return StaffStampReport{Counts: counts, Stamps: stamps}
}
