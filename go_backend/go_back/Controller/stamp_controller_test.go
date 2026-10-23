package controller

import (
	"encoding/json"
	"go_back/go_backend/go_back/model"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// スタンプ取得の 201 の応答：Stamp の JSON はそのままで、secret は隠し画面を開くスタッフのときだけ付く
// スタッフ名は secret の中にだけ出す(Stamp.Staff は今までどおり返さない)
func TestStampResponseJSON(t *testing.T) {
	stamp := model.Stamp{UserID: "user", SpotID: 1, Staff: "Me1td0wn76", StampedAt: time.Date(2026, 10, 31, 10, 0, 0, 0, time.UTC), CellIndex: 4}
	secret := &model.Secret{Room: "special-room", No: 42, Staff: "Me1td0wn76", StampImage: "Me1td0wn76_stamp.png", Stamps: 5}

	decode := func(t *testing.T, res StampResponse) map[string]any {
		t.Helper()
		b, err := json.Marshal(res)
		if err != nil {
			t.Fatal(err)
		}
		var m map[string]any
		if err := json.Unmarshal(b, &m); err != nil {
			t.Fatal(err)
		}
		return m
	}

	without := decode(t, StampResponse{Stamp: stamp})
	plain, _ := json.Marshal(stamp)
	var want map[string]any
	if err := json.Unmarshal(plain, &want); err != nil {
		t.Fatal(err)
	}
	if len(without) != len(want) {
		t.Errorf("without secret: got %v, want the same keys as Stamp %v", without, want)
	}
	for k, v := range want {
		if without[k] != v {
			t.Errorf("without secret: %s = %v, want %v", k, without[k], v)
		}
	}

	with := decode(t, StampResponse{Stamp: stamp, Secret: secret})
	for _, k := range []string{"user_id", "UserID", "staff", "Staff"} {
		if _, ok := with[k]; ok {
			t.Errorf("with secret: top-level %q must not be returned", k)
		}
	}
	if with["spot_id"] != float64(1) || with["cell_index"] != float64(4) {
		t.Errorf("with secret: stamp fields changed: %v", with)
	}
	got, ok := with["secret"].(map[string]any)
	if !ok {
		t.Fatalf("with secret: secret = %v, want an object", with["secret"])
	}
	wantSecret := map[string]any{"room": "special-room", "no": float64(42), "staff": "Me1td0wn76", "stamp_image": "Me1td0wn76_stamp.png", "stamps": float64(5)}
	if len(got) != len(wantSecret) {
		t.Errorf("secret: got %v, want %v", got, wantSecret)
	}
	for k, v := range wantSecret {
		if got[k] != v {
			t.Errorf("secret: %s = %v, want %v", k, got[k], v)
		}
	}
}

// 特別室に入っていない人は「いまの会場」を見られない(403)
func TestGetSpecialRoomLiveForbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/special-room/live", nil)
	c.Set(userIDKey, "special-live-not-entered")
	GetSpecialRoomLive(c)
	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", w.Code)
	}
}
