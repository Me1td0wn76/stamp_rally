package model

import (
	"os"
	"path/filepath"
	"testing"
)

// スタンプ画像のファイル名が、フロントエンドの public/stamps/ に実在するか確かめる
// 名前を間違えても、画面では画像を読み込めずかぼちゃに戻るだけで気づきにくいので、ここで検出する
func TestStampImagesExist(t *testing.T) {
	dir := filepath.Join("..", "..", "..", "stamp_rally_front", "public", "stamps")
	if _, err := os.Stat(dir); err != nil {
		t.Skipf("frontend stamps directory not found: %v", err)
	}

	check := func(owner, file string) {
		if file == "" {
			return
		}
		if _, err := os.Stat(filepath.Join(dir, file)); err != nil {
			t.Errorf("%s: stamp image %q not found in %s", owner, file, dir)
		}
	}
	for _, s := range Spots {
		check("spot "+s.Name, s.StampImage)
	}
	for _, st := range staffTokens {
		check("staff "+st.Staff, st.StampImage)
	}
}

// 取ったマスに出す画像の選び方:
// スタッフ別の画像があればそれ、なければスポットの画像、どちらもなければ空(かぼちゃ)
func TestStampImageOf(t *testing.T) {
	// スタッフ別トークンで取ったスタンプは、そのスタッフの画像
	st := staffTokens[0]
	if st.StampImage == "" {
		t.Skip("first staff has no stamp image")
	}
	if got := stampImageOf(StampSource{SpotID: st.SpotID, Staff: st.Staff}); got != st.StampImage {
		t.Errorf("staff stamp: got %q, want %q", got, st.StampImage)
	}

	// スタッフ別トークンを使わないスポットは、スポットの画像
	staffSpots := map[int]bool{}
	for _, s := range staffTokens {
		staffSpots[s.SpotID] = true
	}
	checked := 0
	for _, s := range Spots {
		if staffSpots[s.ID] || s.StampImage == "" {
			continue
		}
		if got := stampImageOf(StampSource{SpotID: s.ID}); got != s.StampImage {
			t.Errorf("spot %d: got %q, want %q", s.ID, got, s.StampImage)
		}
		checked++
	}
	if checked == 0 {
		t.Error("no spot with a stamp image was checked")
	}

	// 存在しないスポットは空
	if got := stampImageOf(StampSource{SpotID: -1}); got != "" {
		t.Errorf("unknown spot: got %q, want empty", got)
	}
}

// 同じスポットの画像はスポットごとに別々である(どのスポットで取ったかが画像で分かるように)
func TestSpotStampImagesAreUnique(t *testing.T) {
	seen := map[string]int{}
	for _, s := range Spots {
		if s.StampImage == "" {
			continue
		}
		if prev, dup := seen[s.StampImage]; dup {
			t.Errorf("stamp image %q is used by both spot %d and %d", s.StampImage, prev, s.ID)
		}
		seen[s.StampImage] = s.ID
	}
}
