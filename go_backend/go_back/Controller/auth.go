package controller

import (
	"go_back/go_backend/go_back/model"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// ユーザーIDは HttpOnly Cookie でやり取りする
// HttpOnly にすると JavaScript から読めないため、XSS でIDを盗まれにくくなる
// また URL に載らないので、サーバーのアクセスログにも残らない
const (
	userCookieName   = "stamp_rally_uid"
	userCookieMaxAge = 30 * 24 * 60 * 60 // 30日(秒)

	// userIDKey は gin.Context にユーザーIDを保存するときのキー
	userIDKey = "userID"
)

// cookieSecureEnv は Cookie の Secure 属性を環境変数で固定するための設定
// "true" なら常に付ける / "false" なら常に付けない / 未設定ならリクエストから判定する
// 本番(HTTPS)では COOKIE_SECURE=true を設定しておくのが確実
var cookieSecureEnv = os.Getenv("COOKIE_SECURE")

// isSecureRequest は Cookie に Secure を付けるかどうかを判定する
// TLS を終端するリバースプロキシの後ろでは c.Request.TLS が nil になるため、
// プロキシが付ける X-Forwarded-Proto ヘッダーも確認する
// (このヘッダーはクライアントが偽装できるが、偽装しても自分の Cookie に Secure が付くだけなので害は無い)
func isSecureRequest(c *gin.Context) bool {
	switch cookieSecureEnv {
	case "true":
		return true
	case "false":
		return false
	}
	if c.Request.TLS != nil {
		return true
	}
	// プロキシが複数段のときは "https, http" のようにカンマ区切りになるので、先頭(クライアント側)を見る
	proto, _, _ := strings.Cut(c.GetHeader("X-Forwarded-Proto"), ",")
	return strings.EqualFold(strings.TrimSpace(proto), "https")
}

// setUserCookie はユーザーIDを Cookie に書き込む
func setUserCookie(c *gin.Context, userID string) {
	// SameSite=Lax で、他サイトからのPOSTに Cookie が付かないようにする(CSRF対策)
	c.SetSameSite(http.SameSiteLaxMode)
	// HTTPS のときだけ Secure を付ける(開発時の http://localhost でも動くように)
	c.SetCookie(userCookieName, userID, userCookieMaxAge, "/", "", isSecureRequest(c), true)
}

// RequireUser は Cookie からユーザーIDを取り出すミドルウェア
// ミドルウェアとは「ハンドラーの前に実行される共通処理」のこと
// Cookie が無い(スタート前)場合や、未登録のIDの場合は 401 を返して、後続のハンドラーを実行しない
func RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := c.Cookie(userCookieName)
		if err != nil || !model.UserExists(userID) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "not started"})
			return
		}
		c.Set(userIDKey, userID)
		c.Next()
	}
}

// userIDFrom は RequireUser が保存したユーザーIDを取り出す
func userIDFrom(c *gin.Context) string {
	return c.GetString(userIDKey)
}
