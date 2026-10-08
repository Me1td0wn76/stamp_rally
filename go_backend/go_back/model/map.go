package model

// NFC UID -> SpotID へのマッピング
// 各店舗固有の UID をここに登録する。
//
// - 非公開(小文字始まり)にしてあり、読み取りは GetSpotIDByNfcUID 経由のみ。
// - キーは読みやすいようにコロン区切り・大文字で書けばよい。
//   起動時に validate.go の init() が正規化(区切り文字除去 + 大文字化)し、
//   Spots との整合性もチェックする。
var nfcToSpotMap = map[string]int{
	"04:AB:CD:EF:01": 1,
	"04:AB:CD:EF:02": 2,
	"04:AB:CD:EF:03": 3,
	"04:AB:CD:EF:04": 4,
	"04:AB:CD:EF:05": 5,
	"04:AB:CD:EF:06": 6,
	"04:AB:CD:EF:07": 7,
	"04:AB:CD:EF:08": 8,
	"04:AB:CD:EF:09": 9,
}
