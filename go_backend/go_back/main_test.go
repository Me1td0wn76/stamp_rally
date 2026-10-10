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

// フロントエンドの画面の URL の一覧(ビルドすると dist に同じものが出る)
// テストでもこの本物を使い、一覧を書き写さない(一覧を直したときにテストがずれないように)
const routesJSONPath = "../../stamp_rally_front/src/routes.json"

// newFrontendDir は、ビルド済みフロントエンド(dist)の代わりに、index.html・routes.json・JS を 1 つずつ置いたフォルダを作る
func newFrontendDir(t *testing.T) string {
	t.Helper()
	routesJSON, err := os.ReadFile(routesJSONPath)
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	files := map[string]string{
		"index.html":    `<div id="root"></div>`,
		"routes.json":   string(routesJSON),
		"assets/app.js": "console.log(1)",
	}
	for name, body := range files {
		p := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func newFrontendRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	if err := serveFrontend(r, newFrontendDir(t)); err != nil {
		t.Fatal(err)
	}
	return r
}

// serveFrontend が URL ごとに正しいステータスと中身を返すかを確かめる
func TestServeFrontend(t *testing.T) {
	r := newFrontendRouter(t)

	tests := []struct {
		name    string
		method  string
		path    string
		status  int
		bodyHas string
	}{
		{"トップ", http.MethodGet, "/", http.StatusOK, `id="root"`},
		{"/redesign", http.MethodGet, "/redesign", http.StatusOK, `id="root"`},
		{"/mock", http.MethodGet, "/mock", http.StatusOK, `id="root"`},
		{"管理画面", http.MethodGet, "/admin", http.StatusOK, `id="root"`},
		{"管理画面の中のページ", http.MethodGet, "/admin/codeflow", http.StatusOK, `id="root"`},
		{"管理画面の存在しないページ(管理画面が /admin に戻す)", http.MethodGet, "/admin/foo", http.StatusOK, `id="root"`},

		// React Router と同じく、大文字と小文字は区別しない
		{"大文字", http.MethodGet, "/REDESIGN", http.StatusOK, `id="root"`},
		{"大文字と小文字の混在", http.MethodGet, "/Redesign", http.StatusOK, `id="root"`},
		{"管理画面の大文字", http.MethodGet, "/Admin/Codeflow", http.StatusOK, `id="root"`},
		// React Router と同じく、末尾の / はいくつ付いていてもよい
		{"末尾に/", http.MethodGet, "/redesign/", http.StatusOK, `id="root"`},
		{"末尾に/が2つ", http.MethodGet, "/redesign//", http.StatusOK, `id="root"`},
		{"//", http.MethodGet, "//", http.StatusOK, `id="root"`},
		{"管理画面の末尾に/が2つ", http.MethodGet, "/admin//", http.StatusOK, `id="root"`},

		// NFC タグ・QR コードの URL(?spot=<トークン>)は、パスが違っていても画面側で / に移ってスタンプを取るので 200
		{"NFCタグ・QRコードのURL", http.MethodGet, "/?spot=abc", http.StatusOK, `id="root"`},
		{"//?spot=", http.MethodGet, "//?spot=abc", http.StatusOK, `id="root"`},
		{"画面に無いパスでも ?spot= があれば 200", http.MethodGet, "/foo?spot=abc", http.StatusOK, `id="root"`},
		{"?spot= が空なら 404", http.MethodGet, "/foo?spot=", http.StatusNotFound, `id="root"`},

		{"実在するファイル", http.MethodGet, "/assets/app.js", http.StatusOK, "console.log"},
		{"存在しない画面", http.MethodGet, "/foo", http.StatusNotFound, `id="root"`},
		{"/redesign の下の存在しない画面", http.MethodGet, "/redesign/foo", http.StatusNotFound, `id="root"`},
		{"/mock の下の存在しない画面", http.MethodGet, "/mock/foo", http.StatusNotFound, `id="root"`},
		{"/admin で始まるが管理画面ではない", http.MethodGet, "/adminx", http.StatusNotFound, `id="root"`},
		{"先頭に/が2つ", http.MethodGet, "//redesign", http.StatusNotFound, `id="root"`},
		{"存在しないファイル", http.MethodGet, "/assets/none.js", http.StatusNotFound, `id="root"`},
		{"ディレクトリのパス", http.MethodGet, "/assets/", http.StatusNotFound, `id="root"`},
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

// HEAD リクエスト(isRead で GET と同じに通している)も、GET と同じステータスになるかを確かめる
func TestServeFrontendHead(t *testing.T) {
	r := newFrontendRouter(t)
	for path, status := range map[string]int{
		"/":              http.StatusOK,
		"/redesign":      http.StatusOK,
		"/assets/app.js": http.StatusOK,
		"/foo":           http.StatusNotFound,
	} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodHead, path, nil))
		if w.Code != status {
			t.Errorf("HEAD %s: status = %d, want %d", path, w.Code, status)
		}
	}
}

// routes.json にあるすべての画面が 200 になるかを確かめる(一覧に画面を足したときも、そのまま確かめられる)
func TestServeFrontendAllRoutes(t *testing.T) {
	r := newFrontendRouter(t)
	routes, err := loadFrontendRoutes(routesJSONPath)
	if err != nil {
		t.Fatal(err)
	}
	var paths []string
	for _, p := range routes.Pages {
		paths = append(paths, p+"/")
	}
	for _, p := range routes.Sections {
		paths = append(paths, p, p+"/any")
	}
	for _, p := range paths {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, p, nil))
		if w.Code != http.StatusOK {
			t.Errorf("GET %s: status = %d, want 200", p, w.Code)
		}
	}
}

// index.html・routes.json が無い・壊れているときは、serveFrontend がエラーを返す(起動を止める)かを確かめる
func TestServeFrontendBrokenDist(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name   string
		modify func(dir string) error
	}{
		{"index.html が無い", func(dir string) error { return os.Remove(filepath.Join(dir, "index.html")) }},
		{"routes.json が無い", func(dir string) error { return os.Remove(filepath.Join(dir, "routes.json")) }},
		{"routes.json が JSON ではない", func(dir string) error {
			return os.WriteFile(filepath.Join(dir, "routes.json"), []byte("not json"), 0o644)
		}},
		{"pages が空", func(dir string) error {
			return os.WriteFile(filepath.Join(dir, "routes.json"), []byte(`{"pages":{}}`), 0o644)
		}},
		{"/ で始まらない", func(dir string) error {
			return os.WriteFile(filepath.Join(dir, "routes.json"), []byte(`{"pages":{"top":"top"}}`), 0o644)
		}},
		{"sections に /", func(dir string) error {
			return os.WriteFile(filepath.Join(dir, "routes.json"), []byte(`{"pages":{"top":"/"},"sections":{"all":"/"}}`), 0o644)
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := newFrontendDir(t)
			if err := tt.modify(dir); err != nil {
				t.Fatal(err)
			}
			if err := serveFrontend(gin.New(), dir); err == nil {
				t.Error("serveFrontend: err = nil, want error")
			}
		})
	}
}
