package model

import (
	"fmt"
	"log"
)

// init はパッケージ読み込み時(サーバー起動時)に1度だけ実行される。
// データ定義のミスをリクエストが来る前に検出するため、問題があれば panic で起動を止める。
func init() {
	if err := validateAndNormalize(); err != nil {
		panic("model: invalid spot data: " + err.Error())
	}
}

// minQrTokenLength は QrToken の最小文字数
const minQrTokenLength = 16

func validateAndNormalize() error {
	// Spots の検証
	spotIDs := make(map[int]bool)
	qrTokens := make(map[string]int)
	typeCount := make(map[SpotType]int)
	for _, s := range Spots {
		if spotIDs[s.ID] {
			return fmt.Errorf("duplicate spot id: %d", s.ID)
		}
		spotIDs[s.ID] = true

		if !s.Type.IsValid() {
			return fmt.Errorf("spot %d has invalid type: %q", s.ID, s.Type)
		}
		typeCount[s.Type]++
		if s.QrToken == "" {
			return fmt.Errorf("spot %d has empty qr token", s.ID)
		}
		// トークンを知っていれば現地に行かなくてもスタンプが取れるため、推測できない長さを必須にする
		if len(s.QrToken) < minQrTokenLength {
			return fmt.Errorf("qr token of spot %d is too short (min %d chars)", s.ID, minQrTokenLength)
		}
		if prev, dup := qrTokens[s.QrToken]; dup {
			return fmt.Errorf("qr token %q is used by both spot %d and %d", s.QrToken, prev, s.ID)
		}
		qrTokens[s.QrToken] = s.ID
	}

	// --- ビンゴ盤面と Spot 数の整合性 ---
	// 盤面の各 Type のマス数より Spot が少ないと、ビンゴが完成できない
	total := 0
	for t, slots := range bingoTypeSlots {
		total += slots
		if typeCount[t] < slots {
			return fmt.Errorf("bingo card needs %d %q spots but only %d defined", slots, t, typeCount[t])
		}
	}
	if total != bingoCellCount || bingoTypeSlots[bingoCenterType] != 1 {
		return fmt.Errorf("bingoTypeSlots must total %d cells with exactly 1 codeflow (center)", bingoCellCount)
	}

	// NFCマップの検証 キー正規化
	normalized := make(map[string]int, len(nfcToSpotMap))
	for uid, spotID := range nfcToSpotMap {
		key := normalizeNfcUID(uid)
		if key == "" {
			return fmt.Errorf("empty nfc uid in map (raw: %q)", uid)
		}
		if !spotIDs[spotID] {
			return fmt.Errorf("nfc uid %q refers to unknown spot id: %d", uid, spotID)
		}
		if _, dup := normalized[key]; dup {
			return fmt.Errorf("nfc uid %q is duplicated after normalization", uid)
		}
		normalized[key] = spotID
	}
	nfcToSpotMap = normalized

	// --- UID が未登録の Spot は警告のみ ---
	// 全タグの登録が終わったら、ここを return fmt.Errorf(...) に変えれば
	// 「全 Spot に UID がある」ことも起動時に強制できる。
	hasNfc := make(map[int]bool)
	for _, id := range normalized {
		hasNfc[id] = true
	}
	for _, s := range Spots {
		if !hasNfc[s.ID] {
			log.Printf("warning: spot %d (%s) has no NFC UID registered", s.ID, s.Name)
		}
	}
	return nil
}
