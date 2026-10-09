package controller

import (
	"crypto/subtle"
	"go_back/go_backend/go_back/model"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// 管理用 API は、環境変数 ADMIN_PASSWORD を設定したときだけ有効になる
// Basic 認証(ユーザー名は adminUser)で、管理画面(/admin)のログインフォームからも、ブラウザで API の URL を直接開いても使える
const (
	adminUser = "admin"

	// minAdminPasswordLength は ADMIN_PASSWORD の最小文字数
	// 何度でも試せるので、総当たりで当てられない長さを必須にする
	minAdminPasswordLength = 16

	// adminClientHeader は管理画面からの呼び出しに付くヘッダー
	// 付いているときは 401 に WWW-Authenticate を付けない
	// (付けるとブラウザのログインダイアログが出てしまうので、パスワード違いは画面のログインフォームで知らせる)
	adminClientHeader = "X-Admin-Client"
)

// AdminAuth は ADMIN_PASSWORD を使う Basic 認証のミドルウェアを返す
// 未設定・短すぎるときは nil を返し、管理用 API は無効になる
// どちらになったかは起動時のログに出す(Render の Logs で確かめられるように)
func AdminAuth() gin.HandlerFunc {
	password := os.Getenv("ADMIN_PASSWORD")
	if password == "" {
		log.Printf("admin API is disabled (ADMIN_PASSWORD is not set)")
		return nil
	}
	if len(password) < minAdminPasswordLength {
		log.Printf("warning: ADMIN_PASSWORD is too short (min %d chars), admin API is disabled", minAdminPasswordLength)
		return nil
	}
	log.Printf("admin API is enabled")

	return func(c *gin.Context) {
		// 管理用のデータは、開き直したときに古い結果が出ないよう、どのレスポンスもキャッシュさせない
		c.Header("Cache-Control", "no-store")

		// 比べる時間から合っている文字数を推測されないよう、ConstantTimeCompare で比べる
		user, pass, ok := c.Request.BasicAuth()
		userOK := subtle.ConstantTimeCompare([]byte(user), []byte(adminUser)) == 1
		passOK := subtle.ConstantTimeCompare([]byte(pass), []byte(password)) == 1
		if ok && userOK && passOK {
			c.Next()
			return
		}

		if c.GetHeader(adminClientHeader) == "" {
			c.Header("WWW-Authenticate", `Basic realm="admin", charset="UTF-8"`)
		}
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
	}
}

// ブラウザで API の URL を直接開いても読みやすいよう、管理用 API はインデント付きの JSON で返す

// GetStaffStamps は、スタッフ別トークン(CodeFlow)で押されたスタンプの記録と、スタッフごとの数を返すハンドラー
func GetStaffStamps(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, model.GetStaffStampReport())
}

// GetAdminSummary は、参加者数・ビンゴ達成数・スポットごと・時間帯ごとのスタンプ数など、管理画面の概要を返すハンドラー
func GetAdminSummary(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, model.GetAdminSummary())
}

// GetAdminLinks は、QR コード・NFC タグに書き込むトークンを、スポット・スタッフごとに返すハンドラー
// トークンを知っていれば現地に行かなくてもスタンプが取れるので、管理用 API からだけ返す
func GetAdminLinks(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, model.GetAdminLinks())
}
