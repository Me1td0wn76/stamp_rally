package controller

import (
	"go_back/go_backend/go_back/model"
	"net/http"

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

// setUserCookie はユーザーIDを Cookie に書き込む
func setUserCookie(c *gin.Context, userID string) {
	// SameSite=Lax で、他サイトからのPOSTに Cookie が付かないようにする(CSRF対策)
	c.SetSameSite(http.SameSiteLaxMode)
	// HTTPS のときだけ Secure を付ける(開発時の http://localhost でも動くように)
	secure := c.Request.TLS != nil
	c.SetCookie(userCookieName, userID, userCookieMaxAge, "/", "", secure, true)
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
