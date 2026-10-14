package model

import "time"

//----------------------------------------------------------------------
// スタンプ図鑑
//
// 全スポットを番号(スポットID)順に並べ、スタンプを取ったスポットだけ中身(名前・場所・説明・スタンプ画像)を見せる。
// まだ取っていないスポットは、番号と種別だけを返す(画面では ？ で出す)。
// 中身をサーバー側で返さないことで、取る前に開発者ツールなどで見られないようにしている。
//----------------------------------------------------------------------

// ZukanEntry は図鑑の1スポット分
// Acquired が false のときは SpotID・Type 以外は空(omitempty・omitzero で JSON にも出さない)
type ZukanEntry struct {
	SpotID     int       `json:"spot_id"`
	Type       SpotType  `json:"type"`
	Acquired   bool      `json:"acquired"`              // スタンプを取ったか
	Name       string    `json:"name,omitempty"`        // 店名・企画名
	Floor      string    `json:"floor,omitempty"`       // 何階か(階で言えない場所は空)
	Place      string    `json:"place,omitempty"`       // その階のどこか
	Intro      string    `json:"intro,omitempty"`       // 説明文(未記入なら空。画面は「準備中」と出す)
	StampImage string    `json:"stamp_image,omitempty"` // 取ったスタンプの画像(ビンゴのマスと同じもの。空ならかぼちゃ)
	StampedAt  time.Time `json:"stamped_at,omitzero"`   // スタンプを取った日時
}

// GetZukan はユーザーの図鑑を返す(全スポット分。並びは Spots の順)
// 読み取り専用
func GetZukan(userID string) []ZukanEntry {
	Mu.Lock()
	defer Mu.Unlock()

	// 同じスポットのスタンプは1回しか取れない(AcquireStamp)ので、スポットごとに1つ
	stamped := make(map[int]Stamp, len(Stamps[userID]))
	for _, s := range Stamps[userID] {
		stamped[s.SpotID] = s
	}

	entries := make([]ZukanEntry, len(Spots))
	for i, spot := range Spots {
		entry := ZukanEntry{SpotID: spot.ID, Type: spot.Type}
		if s, ok := stamped[spot.ID]; ok {
			entry.Acquired = true
			entry.Name = spot.Name
			entry.Floor = spot.Floor
			entry.Place = spot.Place
			entry.Intro = spot.Intro
			// CodeFlow は押したスタッフの画像になる(ビンゴのマスと同じ選び方)
			entry.StampImage = stampImageOf(StampSource{SpotID: s.SpotID, Staff: s.Staff})
			entry.StampedAt = s.StampedAt
		}
		entries[i] = entry
	}
	return entries
}
