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

func bingoLayoutFor(userID string) [bingoCellCount]SpotType {
	h := fnv.New64a()
	h.Write([]byte(userID))
	r := rand.New(rand.NewSource(int64(h.Sum64())))

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
	return layout
}

// GetBingoResult はユーザーのビンゴ状況を返す。
// 盤面が未生成なら、このタイミングで生成して保持する。
func GetBingoResult(userID string) BingoResult {
	layout := bingoLayoutFor(userID)

	Mu.Lock()
	defer Mu.Unlock()

	// 取得済みスタンプを Type ごとに数える
	remaining := make(map[SpotType]int)
	stampedIDs := make([]int, 0, len(Stamps[userID]))
	for _, s := range Stamps[userID] {
		stampedIDs = append(stampedIDs, s.SpotID)
		if spot, found := GetSpotByID(s.SpotID); found {
			remaining[spot.Type]++
		}
	}

	// 盤面の番号順に、その Type のスタンプが残っていればマスを埋める。
	// 盤面自体がランダムなので、どのマスが埋まるかも結果的にランダムになる。
	cells := make([]BingoCell, bingoCellCount)
	filledCount := 0
	for i, t := range layout {
		filled := remaining[t] > 0
		if filled {
			remaining[t]--
			filledCount++
		}
		cells[i] = BingoCell{Index: i, Type: t, Filled: filled}
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
