package controller

import (
	"go_back/go_backend/go_back/model"
	"net/http"
	"runtime"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

// サーバーの中の数字(特別室の「しくみ」に出す)
// API へのリクエストの数と、返事にかかった時間を数える。メモリに置くだけなので、再起動すると 0 から数え直す
var (
	startedAt   = time.Now()
	apiRequests atomic.Int64
	apiNanos    atomic.Int64
)

// CountRequests は、API へのリクエストの数と、返事にかかった時間を数えるミドルウェア(/api のグループ全体に付ける)
func CountRequests() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		apiNanos.Add(int64(time.Since(start)))
		apiRequests.Add(1)
	}
}

// ServerStatus は GET /api/special-room/how の応答
type ServerStatus struct {
	Go         string  `json:"go"`         // Go のバージョン
	UptimeSec  int64   `json:"uptime_sec"` // サーバーが動きはじめてからの秒数
	Requests   int64   `json:"requests"`   // 受けた API リクエストの数
	AvgMicros  float64 `json:"avg_us"`     // 1回の返事にかかった時間の平均(マイクロ秒)
	Goroutines int     `json:"goroutines"` // いま動いている goroutine の数
	HeapMB     float64 `json:"heap_mb"`    // 使っているメモリ(ヒープ、MB)
	Spots      int     `json:"spots"`      // スポットの数
}

// GetSpecialRoomHow は、特別室の「しくみ」に出すサーバーの中の数字を返すハンドラー
// 特別室に入った人(入室番号がある人)だけが見られる。ほかの人は 403
func GetSpecialRoomHow(c *gin.Context) {
	if !model.IsSecretRoomEntrant(userIDFrom(c), model.SecretSpecialRoom) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not entered"})
		return
	}
	c.JSON(http.StatusOK, serverStatus())
}

func serverStatus() ServerStatus {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	requests := apiRequests.Load()
	avg := 0.0
	if requests > 0 {
		avg = float64(apiNanos.Load()) / float64(requests) / 1e3
	}
	return ServerStatus{
		Go:         runtime.Version(),
		UptimeSec:  int64(time.Since(startedAt).Seconds()),
		Requests:   requests,
		AvgMicros:  avg,
		Goroutines: runtime.NumGoroutine(),
		HeapMB:     float64(mem.HeapAlloc) / (1 << 20),
		Spots:      len(model.Spots),
	}
}
