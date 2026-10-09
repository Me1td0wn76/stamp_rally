package model

import (
	"fmt"
	"log"
	"regexp"
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

// stampImagePattern はスタッフのスタンプ画像(StampImage)のファイル名の形
// フロントエンドは /stamps/<ファイル名> をそのまま読み込むので、英数字・ハイフン・アンダースコアと画像の拡張子だけにする
var stampImagePattern = regexp.MustCompile(`^[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|gif|svg)$`)

func validateAndNormalize() error {
	// スタッフ別トークン(staff.go)を使うスポット
	staffSpots := make(map[int]bool)
	for _, st := range staffTokens {
		staffSpots[st.SpotID] = true
	}

	// Spots の検証
	spotIDs := make(map[int]bool)
	qr := make(map[string]StampSource)
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

		// スタッフ別トークンを使うスポットに共通のトークンがあると、そちらで取ったスタンプは誰が押したかわからなくなる
		if staffSpots[s.ID] {
			if s.QrToken != "" {
				return fmt.Errorf("spot %d uses staff tokens, so its own qr token must be empty", s.ID)
			}
			continue
		}
		if err := addQrToken(qr, s.QrToken, StampSource{SpotID: s.ID}); err != nil {
			return err
		}
	}

	// スタッフ別トークンの検証
	staffNames := make(map[StampSource]bool)
	for _, st := range staffTokens {
		src := StampSource{SpotID: st.SpotID, Staff: st.Staff}
		if !spotIDs[st.SpotID] {
			return fmt.Errorf("staff %q refers to unknown spot id: %d", st.Staff, st.SpotID)
		}
		if st.Staff == "" {
			return fmt.Errorf("staff token of spot %d has empty staff name", st.SpotID)
		}
		if staffNames[src] {
			return fmt.Errorf("staff %q is duplicated in spot %d", st.Staff, st.SpotID)
		}
		staffNames[src] = true
		if st.StampImage != "" && !stampImagePattern.MatchString(st.StampImage) {
			return fmt.Errorf("stamp image of %s must be a file name like \"staff1.png\" (letters, digits, - and _ only): %q", describeSource(src), st.StampImage)
		}
		if err := addQrToken(qr, st.QrToken, src); err != nil {
			return err
		}
	}
	qrSources = qr

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

	// NFCマップ・スタッフの NFC UID の検証 キー正規化
	nfc := make(map[string]StampSource, len(nfcToSpotMap)+len(staffTokens))
	for uid, spotID := range nfcToSpotMap {
		if !spotIDs[spotID] {
			return fmt.Errorf("nfc uid %q refers to unknown spot id: %d", uid, spotID)
		}
		// スタッフ別トークンを使うスポットのタグは、staff.go の NfcUID に登録する
		if staffSpots[spotID] {
			return fmt.Errorf("nfc uid %q refers to spot %d, which uses staff tokens (register it as NfcUID in staff.go)", uid, spotID)
		}
		if err := addNfcUID(nfc, uid, StampSource{SpotID: spotID}); err != nil {
			return err
		}
	}
	for _, st := range staffTokens {
		if st.NfcUID == "" {
			continue
		}
		if err := addNfcUID(nfc, st.NfcUID, StampSource{SpotID: st.SpotID, Staff: st.Staff}); err != nil {
			return err
		}
	}
	nfcSources = nfc

	// --- UID が未登録の Spot は警告のみ ---
	// 全タグの登録が終わったら、ここを return fmt.Errorf(...) に変えれば
	// 「全 Spot に UID がある」ことも起動時に強制できる。
	hasNfc := make(map[int]bool)
	for _, src := range nfc {
		hasNfc[src.SpotID] = true
	}
	for _, s := range Spots {
		if !hasNfc[s.ID] {
			log.Printf("warning: spot %d (%s) has no NFC UID registered", s.ID, s.Name)
		}
	}
	return nil
}

// addQrToken は QR トークンを表に追加する(空・短すぎる・重複しているトークンはエラー)
func addQrToken(sources map[string]StampSource, token string, src StampSource) error {
	if token == "" {
		return fmt.Errorf("%s has empty qr token", describeSource(src))
	}
	// トークンを知っていれば現地に行かなくてもスタンプが取れるため、推測できない長さを必須にする
	if len(token) < minQrTokenLength {
		return fmt.Errorf("qr token of %s is too short (min %d chars)", describeSource(src), minQrTokenLength)
	}
	if prev, dup := sources[token]; dup {
		return fmt.Errorf("qr token %q is used by both %s and %s", token, describeSource(prev), describeSource(src))
	}
	sources[token] = src
	return nil
}

// addNfcUID は NFC UID を正規化して表に追加する(空・重複している UID はエラー)
func addNfcUID(sources map[string]StampSource, uid string, src StampSource) error {
	key := normalizeNfcUID(uid)
	if key == "" {
		return fmt.Errorf("empty nfc uid of %s (raw: %q)", describeSource(src), uid)
	}
	if _, dup := sources[key]; dup {
		return fmt.Errorf("nfc uid %q is duplicated after normalization", uid)
	}
	sources[key] = src
	return nil
}

// describeSource はエラーメッセージ用に、スポット(とスタッフ)を表す文字列を返す
func describeSource(src StampSource) string {
	if src.Staff == "" {
		return fmt.Sprintf("spot %d", src.SpotID)
	}
	return fmt.Sprintf("spot %d staff %q", src.SpotID, src.Staff)
}
