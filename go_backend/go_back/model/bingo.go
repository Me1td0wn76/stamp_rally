package model

import (
	crand "crypto/rand"
	"hash/fnv"
	"math/big"
	"math/rand"
	"sort"
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

	// bingoCenterType は中央マスの Type
	bingoCenterType = SpotTypeCodeflow
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
	Index      int      `json:"index"`                 // マス番号(0~8)
	Type       SpotType `json:"type"`                  // このマスのType
	Filled     bool     `json:"filled"`                // スタンプ取得済か
	StampImage string   `json:"stamp_image,omitempty"` // このマスに出すスタンプ画像(staff.go。スタッフ別トークンで押され、画像が登録されているときだけ入る)
}

// BingoResult はビンゴ状況のレスポンス
type BingoResult struct {
	Cells      []BingoCell `json:"cells"`       // 盤面(0~8)
	StampedIDs []int       `json:"stamped_ids"` // 取得済みスポットID一覧
	BingoCount int         `json:"bingo_count"` // 達成済みビンゴライン数
	BingoLines [][]int     `json:"bingo_lines"` // 達成済みラインのマス番号の一覧
	IsComplete bool        `json:"is_complete"` // 9マスすべてうまっているか
}

// bingoLayoutFor は user_id から盤面の配置（マス番号 → Type）を計算する。
// user_id をハッシュしたものを乱数のシードにするため、結果は user_id だけで決まる
// （同じ user_id → 同じ配置。状態を持たないのでロックも不要）。
func bingoLayoutFor(userID string) [bingoCellCount]SpotType {
	h := fnv.New64a()
	h.Write([]byte(userID))
	r := rand.New(rand.NewSource(int64(h.Sum64())))

	// 中央以外の Type を名前順に並べて、配置の元になる pool を作る。
	// map の走査順は不定なので、順序を固定しないと配置が毎回変わってしまう。
	types := make([]SpotType, 0, len(bingoTypeSlots))
	for t := range bingoTypeSlots {
		if t != bingoCenterType {
			types = append(types, t)
		}
	}
	sort.Slice(types, func(i, j int) bool { return types[i] < types[j] })

	pool := make([]SpotType, 0, bingoCellCount-1)
	for _, t := range types {
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
			layout[i] = bingoCenterType
			continue
		}
		layout[i] = pool[k]
		k++
	}
	return layout
}

// pickBingoCell は、スタンプで埋めるマスをランダムに1つ選ぶ。
// 同じ Type で、まだ埋まっていないマスから選ぶ。空きがなければ -1 を返す。
// 乱数は予測できないよう crypto/rand を使う。
// Stamps を読むので、Mu を取った状態で呼ぶこと。
func pickBingoCell(userID string, t SpotType) (int, error) {
	layout := bingoLayoutFor(userID)

	var used [bingoCellCount]bool
	for _, s := range Stamps[userID] {
		if s.CellIndex >= 0 && s.CellIndex < bingoCellCount {
			used[s.CellIndex] = true
		}
	}

	candidates := make([]int, 0, bingoCellCount)
	for i, cellType := range layout {
		if cellType == t && !used[i] {
			candidates = append(candidates, i)
		}
	}
	if len(candidates) == 0 {
		return -1, nil
	}

	n, err := crand.Int(crand.Reader, big.NewInt(int64(len(candidates))))
	if err != nil {
		return -1, err
	}
	return candidates[n.Int64()], nil
}

// GetBingoResult はユーザーのビンゴ状況を返す。
// 読み取り専用
func GetBingoResult(userID string) BingoResult {
	// 配置は user_id から毎回同じものが計算されるので、保存されない
	layout := bingoLayoutFor(userID)

	Mu.Lock()
	defer Mu.Unlock()

	// スタンプに保存されたマス番号から、埋まっているマスと、そのマスに出す画像を集める
	var filled [bingoCellCount]bool
	var images [bingoCellCount]string
	filledCount := 0
	stampedIDs := make([]int, 0, len(Stamps[userID]))
	for _, s := range Stamps[userID] {
		stampedIDs = append(stampedIDs, s.SpotID)
		if s.CellIndex >= 0 && s.CellIndex < bingoCellCount && !filled[s.CellIndex] {
			filled[s.CellIndex] = true
			images[s.CellIndex] = stampImageOf(StampSource{SpotID: s.SpotID, Staff: s.Staff})
			filledCount++
		}
	}

	cells := make([]BingoCell, bingoCellCount)
	for i, t := range layout {
		cells[i] = BingoCell{Index: i, Type: t, Filled: filled[i], StampImage: images[i]}
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
