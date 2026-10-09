package controller

import (
	"go_back/go_backend/go_back/model"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// 管理用 API は、環境変数 ADMIN_PASSWORD を設定したときだけ有効になる
// ブラウザで開くとユーザー名とパスワードを聞かれる(Basic 認証。ユーザー名は adminUser)
const (
	adminUser = "admin"

	// minAdminPasswordLength は ADMIN_PASSWORD の最小文字数
	// 何度でも試せるので、総当たりで当てられない長さを必須にする
	minAdminPasswordLength = 16
)

// AdminAuth は ADMIN_PASSWORD を使う Basic 認証のミドルウェアを返す
// 未設定・短すぎるときは nil を返し、管理用 API は無効になる
func AdminAuth() gin.HandlerFunc {
	password := os.Getenv("ADMIN_PASSWORD")
	if password == "" {
		return nil
	}
	if len(password) < minAdminPasswordLength {
		log.Printf("warning: ADMIN_PASSWORD is too short (min %d chars), admin API is disabled", minAdminPasswordLength)
		return nil
	}
	return gin.BasicAuth(gin.Accounts{adminUser: password})
}

// GetStaffStamps は、スタッフ別トークン(CodeFlow)で押されたスタンプの記録と、スタッフごとの数を返すハンドラー
func GetStaffStamps(c *gin.Context) {
	// 開き直したときに古い結果が出ないよう、キャッシュさせない
	c.Header("Cache-Control", "no-store")
	// ブラウザで開いて読みやすいよう、インデント付きの JSON で返す
	c.IndentedJSON(http.StatusOK, model.GetStaffStampReport())
}
