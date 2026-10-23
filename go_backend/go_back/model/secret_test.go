package model

import (
	"fmt"
	"net/http"
	"testing"
	"time"
)

// resetSecretRoomNos は、入室番号を 1 から数え直し、部屋にいる人も空にする(テストが終わったら元に戻す)
func resetSecretRoomNos(t *testing.T) {
	t.Helper()
	Mu.Lock()
	savedNos, savedSeen := secretRoomNos, secretRoomSeen
	secretRoomNos = make(map[string]map[string]int)
	secretRoomSeen = make(map[string]map[string]time.Time)
	Mu.Unlock()
	t.Cleanup(func() {
		Mu.Lock()
		secretRoomNos, secretRoomSeen = savedNos, savedSeen
		Mu.Unlock()
	})
}

// firstSecretStaff は、隠し画面を開くスタッフ(Secret のあるスタッフ)を返す
func firstSecretStaff(t *testing.T) staffToken {
	t.Helper()
	for _, st := range staffTokens {
		if st.Secret != "" {
			return st
		}
	}
	t.Fatal("no staff with a secret")
	return staffToken{}
}

// acquireForTest は、テスト用のユーザーでスタンプを取る(取ったスタンプはテストが終わったら消す)
func acquireForTest(t *testing.T, userID string, src StampSource) *Secret {
	t.Helper()
	setTestStamps(t, userID, nil)
	_, secret, status, errMsg := AcquireStamp(userID, src)
	if status != http.StatusCreated {
		t.Fatalf("AcquireStamp(%s): status %d (%s), want 201", describeSource(src), status, errMsg)
	}
	return secret
}

// secret が付くのは、Secret のあるスタッフのスタンプを取ったときだけ
func TestSecretOnlyForSecretStaff(t *testing.T) {
	resetSecretRoomNos(t)

	for i, st := range staffTokens {
		src := StampSource{SpotID: st.SpotID, Staff: st.Staff}
		secret := acquireForTest(t, fmt.Sprintf("secret-test-staff-%d", i), src)
		if st.Secret == "" {
			if secret != nil {
				t.Errorf("%s has no secret, but got %+v", describeSource(src), secret)
			}
			continue
		}
		if secret == nil {
			t.Fatalf("%s has secret %q, but got nil", describeSource(src), st.Secret)
		}
		// スタンプは取ったばかりの 1 つだけ
		want := Secret{Room: st.Secret, No: secret.No, Staff: st.Staff, StampImage: st.StampImage, Stamps: 1}
		if *secret != want {
			t.Errorf("%s: got %+v, want %+v", describeSource(src), *secret, want)
		}
	}

	// スタッフ別トークンを使わないスポットには付かない
	spot := firstSpotWithoutStaff(t)
	if secret := acquireForTest(t, "secret-test-spot", StampSource{SpotID: spot.ID}); secret != nil {
		t.Errorf("spot %d: got %+v, want nil", spot.ID, secret)
	}
}

// stamps は、取ったあとのその人のスタンプの数。同じスタンプをもう一度読んだとき(409)は secret なし
func TestSecretStampsCountAndConflict(t *testing.T) {
	resetSecretRoomNos(t)
	const userID = "secret-test-count"
	st := firstSecretStaff(t)
	src := StampSource{SpotID: st.SpotID, Staff: st.Staff}

	// ほかのスポットで 1 つ取ってから、隠し画面を開くスタンプを取る
	spot := firstSpotWithoutStaff(t)
	acquireForTest(t, userID, StampSource{SpotID: spot.ID})
	_, secret, status, _ := AcquireStamp(userID, src)
	if status != http.StatusCreated || secret == nil {
		t.Fatalf("got status %d, secret %+v, want 201 with a secret", status, secret)
	}
	if secret.Stamps != 2 {
		t.Errorf("stamps: got %d, want 2", secret.Stamps)
	}

	_, secret, status, _ = AcquireStamp(userID, src)
	if status != http.StatusConflict || secret != nil {
		t.Errorf("second time: got status %d, secret %+v, want 409 without a secret", status, secret)
	}
}

// 特別室を開くスタッフのスタンプで埋まったマス・図鑑のスポットだけ special が付く(ほかのスタッフ・スポットには付かない)
func TestSpecialStampMarked(t *testing.T) {
	resetSecretRoomNos(t)
	spot := firstSpotWithoutStaff(t)
	for i, st := range staffTokens {
		userID := fmt.Sprintf("special-mark-test-%d", i)
		acquireForTest(t, userID, StampSource{SpotID: st.SpotID, Staff: st.Staff})
		if _, _, status, errMsg := AcquireStamp(userID, StampSource{SpotID: spot.ID}); status != http.StatusCreated {
			t.Fatalf("AcquireStamp(spot %d): status %d (%s)", spot.ID, status, errMsg)
		}
		want := st.Secret != ""

		specialCells := 0
		for _, c := range GetBingoResult(userID).Cells {
			if c.Special {
				specialCells++
			}
		}
		wantCells := 0
		if want {
			wantCells = 1
		}
		if specialCells != wantCells {
			t.Errorf("staff %q: %d special cells, want %d", st.Staff, specialCells, wantCells)
		}

		for _, e := range GetZukan(userID) {
			switch e.SpotID {
			case st.SpotID:
				if e.Special != want {
					t.Errorf("staff %q: zukan special = %v, want %v", st.Staff, e.Special, want)
				}
			default:
				if e.Special {
					t.Errorf("staff %q: spot %d must not be special", st.Staff, e.SpotID)
				}
			}
		}
	}
}

// 同じ人には同じ番号、別の人には次の番号
func TestSecretRoomNo(t *testing.T) {
	resetSecretRoomNos(t)
	st := firstSecretStaff(t)
	src := StampSource{SpotID: st.SpotID, Staff: st.Staff}

	users := []string{"secret-test-no-a", "secret-test-no-b", "secret-test-no-c"}
	for i, userID := range users {
		secret := acquireForTest(t, userID, src)
		if secret == nil {
			t.Fatalf("%s: got nil secret", userID)
		}
		if want := i + 1; secret.No != want {
			t.Errorf("%s: no = %d, want %d", userID, secret.No, want)
		}
	}

	// もう一度数えても、同じ人は同じ番号のまま(人数も増えない)
	Mu.Lock()
	again := secretFor(users[0], src)
	again2 := secretFor(users[0], src)
	next := secretFor("secret-test-no-d", src)
	Mu.Unlock()
	if again.No != 1 || again2.No != 1 {
		t.Errorf("same user: got no %d and %d, want 1", again.No, again2.No)
	}
	if next.No != len(users)+1 {
		t.Errorf("next user: no = %d, want %d", next.No, len(users)+1)
	}
}

// 「いまの会場」は特別室に入った人だけが見られ、最近取りに来た人を「いま部屋にいる人」として数える
func TestSecretRoomLive(t *testing.T) {
	resetSecretRoomNos(t)
	st := firstSecretStaff(t)
	src := StampSource{SpotID: st.SpotID, Staff: st.Staff}
	now := time.Date(2026, 10, 31, 12, 0, 0, 0, time.UTC)

	// まだ入っていない人は見られない(部屋にいる人にも数えない)
	const outsider = "secret-live-outsider"
	setTestStamps(t, outsider, nil)
	if _, ok := GetSecretRoomLive(outsider, st.Secret, now); ok {
		t.Fatal("outsider: got ok, want not entered")
	}

	acquireForTest(t, "secret-live-a", src)
	acquireForTest(t, "secret-live-b", src)

	a, ok := GetSecretRoomLive("secret-live-a", st.Secret, now)
	if !ok {
		t.Fatal("a: got not entered")
	}
	if a.No != 1 || a.Entrants != 2 || a.Here != 1 {
		t.Errorf("a: got %+v, want no 1, 2 entrants, 1 here", a)
	}
	b, _ := GetSecretRoomLive("secret-live-b", st.Secret, now.Add(10*time.Second))
	if b.No != 2 || b.Here != 2 {
		t.Errorf("b: got %+v, want no 2, 2 here", b)
	}
	// a は 45 秒後にもう一度来た。b は 35 秒前に来たきりなので、もう部屋にいないと見なす
	a, _ = GetSecretRoomLive("secret-live-a", st.Secret, now.Add(45*time.Second))
	if a.Here != 1 {
		t.Errorf("a after 45s: here = %d, want 1", a.Here)
	}

	// 参加者とスタンプは会場全体の数
	Mu.Lock()
	stamps := 0
	for _, s := range Stamps {
		stamps += len(s)
	}
	Mu.Unlock()
	if a.Stamps != stamps || a.Players != userCount() {
		t.Errorf("a: stamps %d, players %d, want %d, %d", a.Stamps, a.Players, stamps, userCount())
	}
}
