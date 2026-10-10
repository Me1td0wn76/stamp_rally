package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// serveFrontend が URL ごとに正しいステータスと中身を返すかを確かめる
func TestServeFrontend(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// ビルド済みフロントエンド(dist)の代わりに、index.html と JS を1つずつ置いたフォルダを使う
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte(`<div id="root"></div>`), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "assets", "app.js"), []byte("console.log(1)"), 0o644); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	serveFrontend(r, dir)

	tests := []struct {
		name    string
		method  string
		path    string
		status  int
		bodyHas string
	}{
		{"トップ", http.MethodGet, "/", http.StatusOK, `id="root"`},
		{"NFCタグ・QRコードのURL", http.MethodGet, "/?spot=abc", http.StatusOK, `id="root"`},
		{"/redesign", http.MethodGet, "/redesign", http.StatusOK, `id="root"`},
		{"末尾に/", http.MethodGet, "/redesign/", http.StatusOK, `id="root"`},
		{"/mock", http.MethodGet, "/mock", http.StatusOK, `id="root"`},
		{"管理画面", http.MethodGet, "/admin", http.StatusOK, `id="root"`},
		{"管理画面の中のページ", http.MethodGet, "/admin/codeflow", http.StatusOK, `id="root"`},
		{"管理画面の存在しないページ(管理画面が /admin に戻す)", http.MethodGet, "/admin/foo", http.StatusOK, `id="root"`},
		{"実在するファイル", http.MethodGet, "/assets/app.js", http.StatusOK, "console.log"},
		{"存在しない画面", http.MethodGet, "/foo", http.StatusNotFound, `id="root"`},
		{"/redesign の下の存在しない画面", http.MethodGet, "/redesign/foo", http.StatusNotFound, `id="root"`},
		{"/mock の下の存在しない画面", http.MethodGet, "/mock/foo", http.StatusNotFound, `id="root"`},
		{"存在しないファイル", http.MethodGet, "/assets/none.js", http.StatusNotFound, `id="root"`},
		{"存在しない API", http.MethodGet, "/api/none", http.StatusNotFound, `"error":"not found"`},
		{"GET 以外", http.MethodPost, "/foo", http.StatusNotFound, `"error":"not found"`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(tt.method, tt.path, nil))
			if w.Code != tt.status {
				t.Errorf("%s %s: status = %d, want %d", tt.method, tt.path, w.Code, tt.status)
			}
			if !strings.Contains(w.Body.String(), tt.bodyHas) {
				t.Errorf("%s %s: body = %q, want to contain %q", tt.method, tt.path, w.Body.String(), tt.bodyHas)
			}
		})
	}
}
