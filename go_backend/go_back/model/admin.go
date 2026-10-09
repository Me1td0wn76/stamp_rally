package model

import (
	"time"
)

// 管理画面(/admin)用の集計
// GET /api/admin/summary・/api/admin/links から使う

// StartedAt はサーバーの起動時刻
// 記録はメモリ上にあり再起動で消えるので、管理画面では「いつからの記録か」として出す
var StartedAt = time.Now()

// maxHourlyBuckets は、時間帯ごとのスタンプ数を返す時間の数(新しい方から)
// 学園祭は 1〜2 日なので、2 日分あれば足りる
const maxHourlyBuckets = 48

// SpotCount はスポットごとのスタンプ数
type SpotCount struct {
	SpotID      int      `json:"spot_id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Type        SpotType `json:"type"`
	Count       int      `json:"count"`
}

// HourCount は 1 時間ごとのスタンプ数
type HourCount struct {
	Hour  time.Time `json:"hour"` // その 1 時間の始まり
	Count int       `json:"count"`
}

// AdminSummary は管理用 API(GET /api/admin/summary)のレスポンス
type AdminSummary struct {
	StartedAt       time.Time   `json:"started_at"`       // サーバーの起動時刻(これより前の記録は残っていない)
	Now             time.Time   `json:"now"`              // サーバーの今の時刻(稼働時間の計算用。端末の時計のずれに左右されないように)
	Users           int         `json:"users"`            // 発行済みのユーザー数(はじめた人)
	MaxUsers        int         `json:"max_users"`        // 発行できるユーザー数の上限(MAX_USERS)
	Players         int         `json:"players"`          // スタンプを 1 つ以上取った人
	Stamps          int         `json:"stamps"`           // スタンプの総数
	BingoPlayers    int         `json:"bingo_players"`    // 1 ライン以上そろった人
	CompletePlayers int         `json:"complete_players"` // 9 マスすべて埋まった人
	FilledHist      []int       `json:"filled_hist"`      // 埋まったマスの数(0〜9)ごとの人数。0 ははじめただけの人
	Spots           []SpotCount `json:"spots"`            // スポットごとのスタンプ数(Spots の順)
	Hourly          []HourCount `json:"hourly"`           // 時間帯ごとのスタンプ数(古い順。最初のスタンプの時間から今の時間まで、最大 maxHourlyBuckets 個)
}

// GetAdminSummary は、管理画面の概要に出す数を集計する
func GetAdminSummary() AdminSummary {
	now := time.Now()

	// Users と Stamps はロックが別なので、続けて読む(同時に取らないので、取る順番によるデッドロックは起きない)
	usersMu.RLock()
	users := len(Users)
	usersMu.RUnlock()

	spots := make([]SpotCount, len(Spots))
	spotIndex := make(map[int]int, len(Spots)) // SpotID → spots の位置
	for i, s := range Spots {
		spots[i] = SpotCount{SpotID: s.ID, Name: s.Name, Description: s.Description, Type: s.Type}
		spotIndex[s.ID] = i
	}

	sum := AdminSummary{
		StartedAt:  StartedAt,
		Now:        now,
		Users:      users,
		MaxUsers:   maxUsers,
		FilledHist: make([]int, bingoCellCount+1),
		Spots:      spots,
		Hourly:     []HourCount{},
	}
	// 1 時間の始まり(Unix 秒)→ スタンプ数
	// time.Time はタイムゾーンの情報まで == で比べるので、マップのキーには秒にしたものを使う
	byHour := make(map[int64]int)

	Mu.Lock()
	for _, userStamps := range Stamps {
		if len(userStamps) == 0 {
			continue
		}
		sum.Players++

		var filled [bingoCellCount]bool
		filledCount := 0
		for _, s := range userStamps {
			sum.Stamps++
			if i, ok := spotIndex[s.SpotID]; ok {
				spots[i].Count++
			}
			byHour[s.StampedAt.Truncate(time.Hour).Unix()]++
			if s.CellIndex >= 0 && s.CellIndex < bingoCellCount && !filled[s.CellIndex] {
				filled[s.CellIndex] = true
				filledCount++
			}
		}
		sum.FilledHist[filledCount]++
		if len(completedBingoLines(filled)) > 0 {
			sum.BingoPlayers++
		}
		if filledCount == bingoCellCount {
			sum.CompletePlayers++
		}
	}
	Mu.Unlock()

	// スタンプを 1 つも取っていない人(はじめただけの人)
	// Users と Stamps は別々に読んでいて、その間に増えることがあるので、マイナスにならないようにする
	sum.FilledHist[0] = max(users-sum.Players, 0)

	// 時間帯ごとのスタンプ数:最初のスタンプの時間から今の時間まで、スタンプが無い時間も 0 で埋める
	// (Truncate は時刻を UTC 基準で切り捨てるが、日本時間は UTC と時間単位でずれているだけなので、区切りは同じになる)
	if len(byHour) > 0 {
		last := now.Truncate(time.Hour).Unix()
		first := last - (maxHourlyBuckets-1)*3600
		oldest := last
		for h := range byHour {
			oldest = min(oldest, h)
		}
		first = max(first, oldest)
		for h := first; h <= last; h += 3600 {
			sum.Hourly = append(sum.Hourly, HourCount{Hour: time.Unix(h, 0), Count: byHour[h]})
		}
	}
	return sum
}

// AdminLink は QR コード・NFC タグに書き込む URL(?spot=<トークン>)1 つ分
// スタッフ別トークンを使うスポット(CodeFlow)は、スタッフごとに 1 つずつ
type AdminLink struct {
	SpotID      int      `json:"spot_id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Type        SpotType `json:"type"`
	Staff       string   `json:"staff,omitempty"`       // スタッフ別トークンのときだけ入る
	StampImage  string   `json:"stamp_image,omitempty"` // スタッフのスタンプ画像(staff.go)
	Token       string   `json:"token"`
}

// GetAdminLinks は、スポット・スタッフごとのトークンを Spots の順に返す
// Spots・staffTokens は起動後に変わらないので、ロックは要らない
func GetAdminLinks() []AdminLink {
	links := []AdminLink{}
	for _, s := range Spots {
		if s.QrToken != "" {
			links = append(links, AdminLink{SpotID: s.ID, Name: s.Name, Description: s.Description, Type: s.Type, Token: s.QrToken})
		}
		for _, st := range staffTokens {
			if st.SpotID == s.ID {
				links = append(links, AdminLink{SpotID: s.ID, Name: s.Name, Description: s.Description, Type: s.Type, Staff: st.Staff, StampImage: st.StampImage, Token: st.QrToken})
			}
		}
	}
	return links
}
