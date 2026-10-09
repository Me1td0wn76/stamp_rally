package model

import (
	"hash/fnv"
	"math/rand"
)

//----------------------------------------------------------------------
// ビンゴ盤面の定義
//
// ビンゴは Type(food/activity/codeflow) に紐づく
//
// マス番号(インデックス)の配置
//
// [0][1][2]
// [3][4][5]
// [6][7][8]
//
// 中央[4]はcodeflowで固定。
// 残り8マスにfoodとactivityが4つずつ、ユーザーごとにランダムで配置される。
//----------------------------------------------------------------------

const (
	bingoCellCount = 9
	bingoCenter    = 4
)

// bingoTypeSlots は盤面に Type が何マスあるか。
// 各 Type の Spot 数がこの数以上ないとビンゴが完成できないため、
// 起動時に validate.go で検証している。
var bingoTypeSlots = map[SpotType]int{
	SpotTypeCodeflow: 1, // 中央固定
	SpotTypeFood:     4,
	SpotTypeActivity: 4,
}

// bingoTypeOrder は乱数を使う順番を固定するための Type の並び。
// map の走査順は不定なので、盤面を毎回同じにするには slice で順序を持つ必要がある。
// （この順番を変えると、既存の user_id の埋まり方が変わる）
var bingoTypeOrder = []SpotType{SpotTypeFood, SpotTypeActivity, SpotTypeCodeflow}

// BingoLines はマス番号(0~8)で定義する。
// 横3・縦3・斜め2 = 計8ライン
var BingoLines = [][]int{
	{0, 1, 2}, {3, 4, 5}, {6, 7, 8}, // 横
	{0, 3, 6}, {1, 4, 7}, {2, 5, 8}, // 縦
	{0, 4, 8}, {2, 4, 6}, // 斜め
}

// BingoCell は盤面の1マス
type BingoCell struct {
	Index  int      `json:"index"`  // マス番号(0~8)
	Type   SpotType `json:"type"`   // このマスのType
	Filled bool     `json:"filled"` // スタンプ取得済か
}

// BingoResult はビンゴ状況のレスポンス
type BingoResult struct {
	Cells      []BingoCell `json:"cells"`       // 盤面(0~8)
	StampedIDs []int       `json:"stamped_ids"` // 取得済みスポットID一覧
	BingoCount int         `json:"bingo_count"` // 達成済みビンゴライン数
	BingoLines [][]int     `json:"bingo_lines"` // 達成済みラインのマス番号の一覧
	IsComplete bool        `json:"is_complete"` // 9マスすべてうまっているか
}

// bingoBoard はユーザー1人分の盤面
type bingoBoard struct {
	layout [bingoCellCount]SpotType // マス番号 → Type
	// Type ごとの「埋まる順番」（マス番号の並び）。
	// その Type の n 個目のスタンプで fillOrder[Type][n-1] のマスが埋まる。
	fillOrder map[SpotType][]int
}

// newBingoBoard は user_id から盤面を計算する。
// user_id をハッシュしたものを乱数のシードにするため、結果は user_id だけで決まる
// （同じ user_id → 同じ盤面。状態を持たないのでロックも不要）。
func newBingoBoard(userID string) bingoBoard {
	h := fnv.New64a()
	h.Write([]byte(userID))
	r := rand.New(rand.NewSource(int64(h.Sum64())))

	// 1. マスの配置
	// ※ この部分の乱数の使い方を変えると、既存ユーザーの配置が変わる
	pool := make([]SpotType, 0, bingoCellCount-1)
	for _, t := range []SpotType{SpotTypeFood, SpotTypeActivity} {
		for i := 0; i < bingoTypeSlots[t]; i++ {
			pool = append(pool, t)
		}
	}
	r.Shuffle(len(pool), func(i, j int) {
		pool[i], pool[j] = pool[j], pool[i]
	})

	var layout [bingoCellCount]SpotType
	k := 0
	for i := range layout {
		if i == bingoCenter {
			layout[i] = SpotTypeCodeflow
			continue
		}
		layout[i] = pool[k]
		k++
	}

	// 2. Type ごとの「埋まる順番」
	// 同じ Type のマスをシャッフルして並べる。n 個目のスタンプで n 番目のマスが埋まる。
	// （毎回残りからランダムに1つ選ぶのと、確率の上では同じ）
	fillOrder := make(map[SpotType][]int, len(bingoTypeOrder))
	for _, t := range bingoTypeOrder {
		indexes := make([]int, 0, bingoTypeSlots[t])
		for i, cellType := range layout {
			if cellType == t {
				indexes = append(indexes, i)
			}
		}
		r.Shuffle(len(indexes), func(i, j int) {
			indexes[i], indexes[j] = indexes[j], indexes[i]
		})
		fillOrder[t] = indexes
	}

	return bingoBoard{layout: layout, fillOrder: fillOrder}
}

// GetBingoResult はユーザーのビンゴ状況を返す。
// 読み取り専用
func GetBingoResult(userID string) BingoResult {
	// 盤面は user_id から毎回同じものが計算されるので、保存されない
	board := newBingoBoard(userID)

	Mu.Lock()
	defer Mu.Unlock()

	// 取得済みスタンプを Type ごとに数える
	stampCount := make(map[SpotType]int)
	stampedIDs := make([]int, 0, len(Stamps[userID]))
	for _, s := range Stamps[userID] {
		stampedIDs = append(stampedIDs, s.SpotID)
		if spot, found := GetSpotByID(s.SpotID); found {
			stampCount[spot.Type]++
		}
	}

	// Type ごとに、スタンプの数だけ「埋まる順番」の先頭から埋める。
	// スタンプが盤面のマス数より多い場合は、マス数で頭打ちになる。
	var filled [bingoCellCount]bool
	filledCount := 0
	for t, n := range stampCount {
		order := board.fillOrder[t]
		if n > len(order) {
			n = len(order)
		}
		for _, idx := range order[:n] {
			filled[idx] = true
			filledCount++
		}
	}

	cells := make([]BingoCell, bingoCellCount)
	for i, t := range board.layout {
		cells[i] = BingoCell{Index: i, Type: t, Filled: filled[i]}
	}

	// ライン判定
	completedLines := [][]int{}
	for _, line := range BingoLines {
		complete := true
		for _, idx := range line {
			if !cells[idx].Filled {
				complete = false
				break
			}
		}
		if complete {
			completedLines = append(completedLines, line)
		}
	}

	return BingoResult{
		Cells:      cells,
		StampedIDs: stampedIDs,
		BingoCount: len(completedLines),
		BingoLines: completedLines,
		IsComplete: filledCount == bingoCellCount,
	}
}
