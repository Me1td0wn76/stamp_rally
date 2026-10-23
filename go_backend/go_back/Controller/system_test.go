package controller

import (
	"net/http"
	"net/http/httptest"
	"runtime"
	"testing"

	"github.com/gin-gonic/gin"
)

// CountRequests は、通ったリクエストの数を数える(返事の時間は、速すぎると 0 になることもある)
func TestCountRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/ping", CountRequests(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	before := apiRequests.Load()
	for range 3 {
		r.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/ping", nil))
	}
	if got := apiRequests.Load() - before; got != 3 {
		t.Errorf("requests: got %d more, want 3", got)
	}
	s := serverStatus()
	if s.Requests < 3 || s.AvgMicros < 0 || s.Go != runtime.Version() || s.Goroutines < 1 || s.HeapMB <= 0 || s.Spots < 1 {
		t.Errorf("server status: got %+v", s)
	}
}

// 特別室に入っていない人は「しくみ」の数字を見られない(403)
func TestGetSpecialRoomHowForbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/special-room/how", nil)
	c.Set(userIDKey, "special-how-not-entered")
	GetSpecialRoomHow(c)
	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", w.Code)
	}
}
