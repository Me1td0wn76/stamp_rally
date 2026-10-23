package model

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

// setTestStamps は、テスト用のユーザーにスタンプを持たせる(テストが終わったら消す)
func setTestStamps(t *testing.T, userID string, stamps []Stamp) {
	t.Helper()
	Mu.Lock()
	Stamps[userID] = stamps
	Mu.Unlock()
	t.Cleanup(func() {
		Mu.Lock()
		delete(Stamps, userID)
		Mu.Unlock()
	})
}

// firstSpotWithoutStaff は、スタッフ別トークンを使わないスポット(取ったらスポットの画像が出る)を返す
func firstSpotWithoutStaff(t *testing.T) Spot {
	t.Helper()
	staffSpots := map[int]bool{}
	for _, st := range staffTokens {
		staffSpots[st.SpotID] = true
	}
	for _, s := range Spots {
		if !staffSpots[s.ID] {
			return s
		}
	}
	t.Fatal("no spot without staff tokens")
	return Spot{}
}

// 図鑑は全スポットを Spots の順に返し、取ったスポットだけ中身を見せる
func TestGetZukan(t *testing.T) {
	const userID = "zukan-test-user"
	spot := firstSpotWithoutStaff(t)
	staff := staffTokens[0]
	at := time.Date(2026, 10, 14, 13, 5, 0, 0, time.Local)
	setTestStamps(t, userID, []Stamp{
		{UserID: userID, SpotID: spot.ID, StampedAt: at, CellIndex: -1},
		{UserID: userID, SpotID: staff.SpotID, Staff: staff.Staff, StampedAt: at, CellIndex: bingoCenter},
	})

	entries := GetZukan(userID)
	if len(entries) != len(Spots) {
		t.Fatalf("got %d entries, want %d", len(entries), len(Spots))
	}
	for i, e := range entries {
		s := Spots[i]
		if e.SpotID != s.ID || e.Type != s.Type {
			t.Errorf("entry %d: got spot %d (%s), want spot %d (%s)", i, e.SpotID, e.Type, s.ID, s.Type)
		}
		switch s.ID {
		case spot.ID:
			want := ZukanEntry{SpotID: s.ID, Type: s.Type, Acquired: true, Name: s.Name, Floor: s.Floor, Place: s.Place, Intro: s.Intro, StampImage: s.StampImage, StampedAt: at}
			if e != want {
				t.Errorf("acquired spot %d: got %+v, want %+v", s.ID, e, want)
			}
		case staff.SpotID:
			// スタッフ別トークンで取ったスポットは、ビンゴのマスと同じくそのスタッフの画像
			if !e.Acquired || e.Name != s.Name {
				t.Errorf("staff spot %d: got %+v, want acquired with name %q", s.ID, e, s.Name)
			}
			if want := stampImageOf(StampSource{SpotID: staff.SpotID, Staff: staff.Staff}); e.StampImage != want {
				t.Errorf("staff spot %d: got image %q, want %q", s.ID, e.StampImage, want)
			}
		default:
			// まだ取っていないスポットは、番号と種別だけ
			if want := (ZukanEntry{SpotID: s.ID, Type: s.Type}); e != want {
				t.Errorf("not acquired spot %d: got %+v, want %+v", s.ID, e, want)
			}
		}
	}
}

// スタンプを1つも取っていないユーザー(スタート直後)は、全スポットが ？ になる
func TestGetZukanNoStamps(t *testing.T) {
	for _, e := range GetZukan("zukan-test-user-without-stamps") {
		if e.Acquired || e.Name != "" {
			t.Errorf("spot %d: got %+v, want not acquired", e.SpotID, e)
		}
	}
}

// まだ取っていないスポットの名前・場所・説明・画像・日時は、JSON にも出さない
// (画面では ？ で出すので、開発者ツールで中身を見られないように)
func TestZukanJSONHidesNotAcquired(t *testing.T) {
	s := Spots[len(Spots)-1]
	b, err := json.Marshal(ZukanEntry{SpotID: s.ID, Type: s.Type})
	if err != nil {
		t.Fatal(err)
	}
	got := string(b)
	for _, key := range []string{"name", "floor", "place", "intro", "stamp_image", "special", "stamped_at"} {
		if strings.Contains(got, `"`+key+`"`) {
			t.Errorf("not acquired entry has %q: %s", key, got)
		}
	}
	if s.Name != "" && strings.Contains(got, s.Name) {
		t.Errorf("not acquired entry has the spot name: %s", got)
	}
}
