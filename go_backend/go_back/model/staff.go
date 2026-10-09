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
// - 非公開(小文字始まり)にしてあり、読み取りは ResolveQrToken / ResolveNfcUID 経由のみ。
// - 起動時に validate.go がトークンの長さ・重複、SpotID の存在、スタッフ名の重複などをチェックする。
// - トークンを変えると、そのスタッフのタグ・QR は書き直しになる(書き込み・印刷の前に確定させる)。
//   スタッフ名は管理用 API・ログに出るだけなので、あとから変えてもよい。
// - StampImage を登録すると、そのスタッフが押したマスにはかぼちゃの代わりにその画像が出る(GET /api/bingo の stamp_image)。
//   画像は stamp_rally_front/public/stamps/ に置く。ユーザーに返すのはファイル名だけで、スタッフ名は返さない。
type staffToken struct {
	SpotID     int    // スタンプを押すスポット
	Staff      string // スタッフの名前(スポットの中で重複不可)
	QrToken    string // このスタッフの QRコード・NFCタグの URL(?spot=<トークン>)に入れるトークン
	NfcUID     string // このスタッフの NFC タグの UID(アプリの NFC 読み込み画面用。未登録なら空)
	StampImage string // このスタッフが押したマスに出す画像(public/stamps/ のファイル名。空ならほかのマスと同じかぼちゃ)
}

var staffTokens = []staffToken{
	{SpotID: 1, Staff: "スタッフ1", QrToken: "zFQCO4BjiSJCz1dt0Dw9Rw", StampImage: "staff1.svg"},
	{SpotID: 1, Staff: "スタッフ2", QrToken: "fUAtG4HeJkFkUyz7LUJqdw", StampImage: "staff2.svg"},
	{SpotID: 1, Staff: "スタッフ3", QrToken: "qYXSsfLX8eBK67ey6gisiw", StampImage: "staff3.svg"},
}

// stampImageOf は、スタンプを押したスタッフの画像のファイル名を返す
// スタッフ別トークンで取ったスタンプでないとき・画像が未登録のときは空
func stampImageOf(src StampSource) string {
	if src.Staff == "" {
		return ""
	}
	for _, st := range staffTokens {
		if st.SpotID == src.SpotID && st.Staff == src.Staff {
			return st.StampImage
		}
	}
	return ""
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
